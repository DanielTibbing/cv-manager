import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import {
  LetterSchema,
  ResumeIndexSchema,
  ResumeSchema,
  type Letter,
  type Resume,
  type ResumeIndex,
} from "@/lib/schema";
import { newLetter, seedResume } from "@/lib/defaults";

const DATA_DIR = path.join(process.cwd(), "data");
const RESUMES_DIR = path.join(DATA_DIR, "resumes");
const LETTERS_DIR = path.join(DATA_DIR, "letters");
const BACKUPS_DIR = path.join(DATA_DIR, "backups");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const EXPORTS_DIR = path.join(process.cwd(), "exports");
const INDEX_FILE = path.join(DATA_DIR, "index.json");

const MAX_BACKUPS_PER_RESUME = 20;

// Thrown when a write's base version no longer matches the stored document —
// a stale editor tab trying to save over newer data. Routes map it to 409.
export class ConflictError extends Error {
  constructor(public serverUpdatedAt: string) {
    super("Document was modified by another writer");
  }
}

async function ensureDirs() {
  await Promise.all(
    [RESUMES_DIR, LETTERS_DIR, BACKUPS_DIR, UPLOADS_DIR, EXPORTS_DIR].map(
      (dir) => fs.mkdir(dir, { recursive: true })
    )
  );
}

// Atomic write: write to a temp file in the same directory, then rename.
async function writeJsonAtomic(filePath: string, value: unknown) {
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

function safeId(id: string) {
  // ids are nanoid-generated; reject anything path-like defensively
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error(`Invalid id: ${id}`);
  return id;
}

function resumeFile(id: string) {
  return path.join(RESUMES_DIR, `${safeId(id)}.json`);
}

function letterFile(id: string) {
  return path.join(LETTERS_DIR, `${safeId(id)}.json`);
}

export async function readIndex(): Promise<ResumeIndex> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(INDEX_FILE, "utf8");
    return ResumeIndexSchema.parse(JSON.parse(raw));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    // First run: seed a sample resume and a starter base letter so every
    // part of the app has data.
    const seed = seedResume();
    await writeJsonAtomic(resumeFile(seed.id), seed);
    const baseLetter = {
      ...newLetter({ name: "Base letter", resumeId: seed.id }),
      isBase: true,
    };
    await writeJsonAtomic(letterFile(baseLetter.id), baseLetter);
    const index: ResumeIndex = {
      version: 1,
      activeResumeId: seed.id,
      resumes: [indexEntry(seed)],
      letters: [letterIndexEntry(baseLetter)],
    };
    await writeJsonAtomic(INDEX_FILE, index);
    return index;
  }
}

function indexEntry(resume: Resume) {
  return {
    id: resume.id,
    name: resume.name,
    templateId: resume.templateId,
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt,
  };
}

async function writeIndex(index: ResumeIndex) {
  await writeJsonAtomic(INDEX_FILE, ResumeIndexSchema.parse(index));
}

export async function readResume(id: string): Promise<Resume | null> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(resumeFile(id), "utf8");
    return ResumeSchema.parse(JSON.parse(raw));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

async function backupDocument(srcPath: string, id: string) {
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await fs.copyFile(srcPath, path.join(BACKUPS_DIR, `${id}-${stamp}.json`));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
    throw err;
  }
  // prune old backups for this document
  const files = (await fs.readdir(BACKUPS_DIR))
    .filter((f) => f.startsWith(`${id}-`))
    .sort();
  const excess = files.length - MAX_BACKUPS_PER_RESUME;
  for (let i = 0; i < excess; i++) {
    await fs.unlink(path.join(BACKUPS_DIR, files[i]));
  }
}

const backupResume = (id: string) => backupDocument(resumeFile(id), id);
const backupLetter = (id: string) => backupDocument(letterFile(id), id);

export async function writeResume(
  resume: Resume,
  opts?: { baseUpdatedAt?: string }
): Promise<Resume> {
  const index = await readIndex();
  if (opts?.baseUpdatedAt) {
    const stored = await readResume(resume.id);
    if (stored && stored.updatedAt !== opts.baseUpdatedAt) {
      throw new ConflictError(stored.updatedAt);
    }
  }
  const validated = ResumeSchema.parse({
    ...resume,
    updatedAt: new Date().toISOString(),
  });
  await backupResume(validated.id);
  await writeJsonAtomic(resumeFile(validated.id), validated);

  const entries = index.resumes.map((r) =>
    r.id === validated.id ? indexEntry(validated) : r
  );
  if (!entries.some((r) => r.id === validated.id)) entries.push(indexEntry(validated));
  await writeIndex({ ...index, resumes: entries });
  return validated;
}

export async function createResume(resume: Resume): Promise<Resume> {
  const index = await readIndex();
  const validated = ResumeSchema.parse(resume);
  await writeJsonAtomic(resumeFile(validated.id), validated);
  await writeIndex({
    ...index,
    activeResumeId: index.activeResumeId ?? validated.id,
    resumes: [...index.resumes, indexEntry(validated)],
  });
  return validated;
}

export async function deleteResume(id: string): Promise<void> {
  const index = await readIndex();
  // Letters styled by this resume must keep rendering identically: freeze the
  // resume's tokens + profile into each linked letter before deleting.
  const doomed = await readResume(id);
  if (doomed) {
    for (const entry of index.letters.filter((l) => l.resumeId === id)) {
      const letter = await readLetter(entry.id);
      if (!letter) continue;
      await writeLetter({
        ...letter,
        resumeId: null,
        snapshot: {
          templateId: doomed.templateId,
          themeOverrides: doomed.themeOverrides,
          profile: doomed.profile,
        },
      });
    }
  }
  await backupResume(id);
  await fs.rm(resumeFile(id), { force: true });
  const fresh = await readIndex(); // letters were re-indexed above
  const resumes = fresh.resumes.filter((r) => r.id !== id);
  await writeIndex({
    ...fresh,
    resumes,
    activeResumeId:
      fresh.activeResumeId === id ? resumes[0]?.id ?? null : fresh.activeResumeId,
  });
}

// ---------- letters ----------

function letterIndexEntry(letter: Letter) {
  return {
    id: letter.id,
    name: letter.name,
    company: letter.company,
    role: letter.role,
    status: letter.status,
    resumeId: letter.resumeId,
    isBase: letter.isBase,
    createdAt: letter.createdAt,
    updatedAt: letter.updatedAt,
  };
}

export async function readLetter(id: string): Promise<Letter | null> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(letterFile(id), "utf8");
    return LetterSchema.parse(JSON.parse(raw));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function writeLetter(
  letter: Letter,
  opts?: { baseUpdatedAt?: string }
): Promise<Letter> {
  const index = await readIndex();
  if (opts?.baseUpdatedAt) {
    const stored = await readLetter(letter.id);
    if (stored && stored.updatedAt !== opts.baseUpdatedAt) {
      throw new ConflictError(stored.updatedAt);
    }
  }
  const validated = LetterSchema.parse({
    ...letter,
    updatedAt: new Date().toISOString(),
  });
  await backupLetter(validated.id);
  await writeJsonAtomic(letterFile(validated.id), validated);

  const letters = index.letters.map((l) =>
    l.id === validated.id ? letterIndexEntry(validated) : l
  );
  if (!letters.some((l) => l.id === validated.id)) {
    letters.push(letterIndexEntry(validated));
  }
  await writeIndex({ ...index, letters });
  return validated;
}

export async function createLetter(letter: Letter): Promise<Letter> {
  const index = await readIndex();
  const validated = LetterSchema.parse(letter);
  await writeJsonAtomic(letterFile(validated.id), validated);
  await writeIndex({
    ...index,
    letters: [...index.letters, letterIndexEntry(validated)],
  });
  return validated;
}

export async function deleteLetter(id: string): Promise<void> {
  const index = await readIndex();
  await backupLetter(id);
  await fs.rm(letterFile(id), { force: true });
  await writeIndex({
    ...index,
    letters: index.letters.filter((l) => l.id !== id),
  });
}

export async function setActiveResume(id: string): Promise<ResumeIndex> {
  const index = await readIndex();
  if (!index.resumes.some((r) => r.id === id)) {
    throw new Error(`Unknown resume id: ${id}`);
  }
  const next = { ...index, activeResumeId: id };
  await writeIndex(next);
  return next;
}
