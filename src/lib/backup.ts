import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { strFromU8, unzipSync, zipSync } from "fflate";
import {
  BACKUPS_DIR,
  INDEX_FILE,
  LETTERS_DIR,
  RESUMES_DIR,
  UPLOADS_DIR,
  ensureDirs,
  readIndex,
  writeJsonAtomic,
} from "@/lib/storage";
import {
  LetterSchema,
  ResumeIndexSchema,
  ResumeSchema,
  type Letter,
  type Resume,
  type ResumeIndex,
} from "@/lib/schema";

// Backup archives are a straight zip of data/ (minus rolling backups), meant
// to be shuffled between machines via e.g. Google Drive. Import is a MERGE,
// not a restore: documents are matched by name, identical name+updatedAt is
// the same item (skip), same name with a different updatedAt is a conflict the
// user resolves per item (keep existing / use imported / keep both).
//
// Documents are written verbatim — never through writeResume/writeLetter,
// which would stamp a fresh updatedAt and break skip-detection on the next
// import. index.json is rebuilt from the final on-disk documents rather than
// merged from the archive.

export class BackupValidationError extends Error {}

export type {
  ImportConflict,
  ImportPlan,
  ImportPlanItem,
  ImportSummary,
  Resolution,
} from "@/lib/backup-types";

import type { ImportPlan, ImportSummary, Resolution } from "@/lib/backup-types";

// ---------- export ----------

export async function createBackupZip(): Promise<Uint8Array> {
  await ensureDirs();
  const entries: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {};
  const put = async (zipPath: string, filePath: string, compress = true) => {
    try {
      const bytes = await fs.readFile(filePath);
      // Photos are already compressed; zip level 0 just stores them.
      entries[zipPath] = compress ? bytes : [bytes, { level: 0 }];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  };
  await put("index.json", INDEX_FILE);
  for (const file of await fs.readdir(RESUMES_DIR)) {
    if (file.endsWith(".json")) {
      await put(`resumes/${file}`, path.join(RESUMES_DIR, file));
    }
  }
  for (const file of await fs.readdir(LETTERS_DIR)) {
    if (file.endsWith(".json")) {
      await put(`letters/${file}`, path.join(LETTERS_DIR, file));
    }
  }
  for (const file of await fs.readdir(UPLOADS_DIR)) {
    await put(`uploads/${file}`, path.join(UPLOADS_DIR, file), false);
  }
  return zipSync(entries, { level: 6 });
}

// ---------- archive parsing + validation ----------

type ParsedBackup = {
  resumes: Resume[];
  letters: Letter[];
  uploads: Map<string, Uint8Array>; // filename -> bytes
};

const DOC_PATH = /^(resumes|letters)\/([A-Za-z0-9_-]+)\.json$/;
const UPLOAD_PATH = /^uploads\/([A-Za-z0-9_-]+)\.(jpg|png|webp)$/;

function fail(message: string): never {
  throw new BackupValidationError(message);
}

function parseBackup(bytes: Uint8Array): ParsedBackup {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    fail("Not a valid zip archive");
  }
  const parsed: ParsedBackup = { resumes: [], letters: [], uploads: new Map() };
  for (const [zipPath, content] of Object.entries(files)) {
    // Tolerate the junk macOS adds when re-zipping via Finder.
    if (zipPath.endsWith("/") || zipPath.startsWith("__MACOSX/")) continue;
    if (zipPath === "index.json") {
      // Presence is optional (the index is rebuilt on import), but when
      // present it must be valid — a corrupt one signals a corrupt archive.
      try {
        ResumeIndexSchema.parse(JSON.parse(strFromU8(content)));
      } catch {
        fail("index.json is not a valid CV Manager index");
      }
      continue;
    }
    const docMatch = DOC_PATH.exec(zipPath);
    if (docMatch) {
      const [, kind, id] = docMatch;
      let doc: unknown;
      try {
        doc = JSON.parse(strFromU8(content));
      } catch {
        fail(`${zipPath} is not valid JSON`);
      }
      if (kind === "resumes") {
        const result = ResumeSchema.safeParse(doc);
        if (!result.success) fail(`${zipPath} failed schema validation`);
        if (result.data.id !== id) {
          fail(`${zipPath}: document id does not match its filename`);
        }
        parsed.resumes.push(result.data);
      } else {
        const result = LetterSchema.safeParse(doc);
        if (!result.success) fail(`${zipPath} failed schema validation`);
        if (result.data.id !== id) {
          fail(`${zipPath}: document id does not match its filename`);
        }
        parsed.letters.push(result.data);
      }
      continue;
    }
    const uploadMatch = UPLOAD_PATH.exec(zipPath);
    if (uploadMatch) {
      parsed.uploads.set(`${uploadMatch[1]}.${uploadMatch[2]}`, content);
      continue;
    }
    fail(`Unexpected file in archive: ${zipPath}`);
  }
  return parsed;
}

// ---------- classification (shared by analyze + apply) ----------

type Classification = {
  plan: ImportPlan;
  // importedId -> matching local id, for skip and conflict items.
  localMatch: Map<string, string>;
  uploadSkips: Set<string>;
};

async function classify(parsed: ParsedBackup): Promise<Classification> {
  const index = await readIndex();
  const plan: ImportPlan = {
    add: [],
    skip: [],
    conflicts: [],
    uploads: { add: 0, skip: 0 },
  };
  const localMatch = new Map<string, string>();

  const classifyDoc = (
    kind: "resume" | "letter",
    doc: Resume | Letter,
    locals: { id: string; name: string; updatedAt: string }[]
  ) => {
    const match =
      locals.find((l) => l.name === doc.name && l.updatedAt === doc.updatedAt) ??
      locals.find((l) => l.name === doc.name);
    if (!match) {
      plan.add.push({ kind, importedId: doc.id, name: doc.name });
    } else if (match.updatedAt === doc.updatedAt) {
      plan.skip.push({ kind, importedId: doc.id, name: doc.name });
      localMatch.set(doc.id, match.id);
    } else {
      plan.conflicts.push({
        kind,
        importedId: doc.id,
        name: doc.name,
        localId: match.id,
        existingUpdatedAt: match.updatedAt,
        importedUpdatedAt: doc.updatedAt,
      });
      localMatch.set(doc.id, match.id);
    }
  };

  for (const resume of parsed.resumes) classifyDoc("resume", resume, index.resumes);
  for (const letter of parsed.letters) classifyDoc("letter", letter, index.letters);

  // Every letter link must resolve: its resume is either in the archive (any
  // merge outcome maps it to a local id) or already exists locally. Checked
  // upfront so apply never fails mid-write.
  const resolvableResumeIds = new Set([
    ...parsed.resumes.map((r) => r.id),
    ...index.resumes.map((r) => r.id),
  ]);
  for (const letter of parsed.letters) {
    if (letter.resumeId && !resolvableResumeIds.has(letter.resumeId)) {
      fail(
        `Letter "${letter.name}" links to resume ${letter.resumeId}, ` +
          "which is neither in the archive nor in local data"
      );
    }
  }

  const uploadSkips = new Set<string>();
  for (const [name, bytes] of parsed.uploads) {
    try {
      const local = await fs.readFile(path.join(UPLOADS_DIR, name));
      if (local.length === bytes.length && local.equals(bytes)) {
        uploadSkips.add(name);
        plan.uploads.skip++;
      } else {
        plan.uploads.add++; // name taken by different bytes → renamed on apply
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      plan.uploads.add++;
    }
  }
  return { plan, localMatch, uploadSkips };
}

export async function analyzeBackup(bytes: Uint8Array): Promise<ImportPlan> {
  const { plan } = await classify(parseBackup(bytes));
  return plan;
}

// ---------- apply ----------

export async function applyBackup(
  bytes: Uint8Array,
  resolutions: Record<string, Resolution>
): Promise<ImportSummary> {
  const parsed = parseBackup(bytes);
  const { plan, localMatch, uploadSkips } = await classify(parsed);
  const changes =
    plan.add.length + plan.uploads.add +
    plan.conflicts.filter((c) => resolutions[c.importedId] !== "existing").length;
  const summary: ImportSummary = {
    added: 0,
    skipped: plan.skip.length,
    replaced: 0,
    keptBoth: 0,
    uploadsAdded: 0,
  };
  if (changes === 0) return summary;

  await ensureDirs();
  // Safety net before touching anything: a full pre-import snapshot.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await fs.writeFile(
    path.join(BACKUPS_DIR, `pre-import-${stamp}.zip`),
    await createBackupZip()
  );

  // Pass 1: uploads. Filenames colliding with different local bytes get a
  // -2/-3/… suffix; photo.file references are remapped through fileMap.
  const fileMap = new Map<string, string>();
  const assignedNames = new Set<string>();
  for (const [name, content] of parsed.uploads) {
    if (uploadSkips.has(name)) continue;
    const ext = path.extname(name);
    const base = path.basename(name, ext);
    let finalName = name;
    for (let n = 2; ; n++) {
      const existsLocal = await fs
        .access(path.join(UPLOADS_DIR, finalName))
        .then(() => true, () => false);
      if (!existsLocal && !assignedNames.has(finalName)) break;
      // Same name with identical bytes was already classified as skip, so any
      // hit here means a real collision → suffix.
      finalName = `${base}-${n}${ext}`;
    }
    assignedNames.add(finalName);
    await fs.writeFile(path.join(UPLOADS_DIR, finalName), content);
    if (finalName !== name) fileMap.set(name, finalName);
    summary.uploadsAdded++;
  }
  const remapPhoto = (profile: Resume["profile"]) => {
    if (profile.photo && fileMap.has(profile.photo.file)) {
      profile.photo.file = fileMap.get(profile.photo.file)!;
    }
  };

  // Pass 2: resumes. Builds resumeIdMap (importedId -> final local id) used
  // to rewire letter links below.
  const resumeIdMap = new Map<string, string>();
  const localResumeIds = new Set(
    (await readIndex()).resumes.map((r) => r.id)
  );
  const writtenResumeIds = new Set<string>();

  for (const imported of parsed.resumes) {
    const localId = localMatch.get(imported.id);
    const conflict = plan.conflicts.find((c) => c.importedId === imported.id);
    const action = conflict
      ? (resolutions[imported.id] ?? "existing")
      : localId
        ? "skip"
        : "add";

    const final = structuredClone(imported);
    if (action === "skip" || action === "existing") {
      resumeIdMap.set(imported.id, localId!);
      continue;
    }
    if (action === "imported") {
      final.id = localId!; // replace in place: local letter links keep working
      summary.replaced++;
    } else {
      // "add" or "both": fresh id on collision (or always for keep-both).
      if (action === "both") {
        final.id = nanoid();
        final.name = `${imported.name} (imported)`;
        summary.keptBoth++;
      } else {
        if (localResumeIds.has(final.id)) final.id = nanoid();
        summary.added++;
      }
      while (writtenResumeIds.has(final.id)) final.id = nanoid();
    }
    remapPhoto(final.profile);
    await writeJsonAtomic(path.join(RESUMES_DIR, `${final.id}.json`), final);
    writtenResumeIds.add(final.id);
    resumeIdMap.set(imported.id, final.id);
  }

  // Pass 3: letters. resumeId is rewritten through resumeIdMap; a link to a
  // resume that is neither in the archive nor local is rejected.
  const localLetterIds = new Set((await readIndex()).letters.map((l) => l.id));
  const writtenLetterIds = new Set<string>();

  for (const imported of parsed.letters) {
    const localId = localMatch.get(imported.id);
    const conflict = plan.conflicts.find((c) => c.importedId === imported.id);
    const action = conflict
      ? (resolutions[imported.id] ?? "existing")
      : localId
        ? "skip"
        : "add";
    if (action === "skip" || action === "existing") continue;

    const final = structuredClone(imported);
    if (action === "imported") {
      final.id = localId!;
      summary.replaced++;
    } else {
      if (action === "both") {
        final.id = nanoid();
        final.name = `${imported.name} (imported)`;
        summary.keptBoth++;
      } else {
        if (localLetterIds.has(final.id)) final.id = nanoid();
        summary.added++;
      }
      while (writtenLetterIds.has(final.id)) final.id = nanoid();
    }
    if (final.resumeId) {
      // Upfront validation guarantees resolvability: archive links are
      // remapped to their final local id, pre-existing local ids pass through.
      final.resumeId = resumeIdMap.get(final.resumeId) ?? final.resumeId;
    }
    if (final.snapshot) remapPhoto(final.snapshot.profile);
    await writeJsonAtomic(path.join(LETTERS_DIR, `${final.id}.json`), final);
    writtenLetterIds.add(final.id);
  }

  // Pass 4: rebuild index.json from the documents now on disk.
  const previous = await readIndex();
  const index: ResumeIndex = { version: 1, activeResumeId: null, resumes: [], letters: [] };
  for (const file of await fs.readdir(RESUMES_DIR)) {
    if (!file.endsWith(".json")) continue;
    const resume = ResumeSchema.parse(
      JSON.parse(await fs.readFile(path.join(RESUMES_DIR, file), "utf8"))
    );
    index.resumes.push({
      id: resume.id,
      name: resume.name,
      templateId: resume.templateId,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    });
  }
  for (const file of await fs.readdir(LETTERS_DIR)) {
    if (!file.endsWith(".json")) continue;
    const letter = LetterSchema.parse(
      JSON.parse(await fs.readFile(path.join(LETTERS_DIR, file), "utf8"))
    );
    index.letters.push({
      id: letter.id,
      name: letter.name,
      company: letter.company,
      role: letter.role,
      status: letter.status,
      resumeId: letter.resumeId,
      isBase: letter.isBase,
      createdAt: letter.createdAt,
      updatedAt: letter.updatedAt,
    });
  }
  index.activeResumeId = index.resumes.some((r) => r.id === previous.activeResumeId)
    ? previous.activeResumeId
    : (index.resumes[0]?.id ?? null);
  await writeJsonAtomic(INDEX_FILE, ResumeIndexSchema.parse(index));

  return summary;
}
