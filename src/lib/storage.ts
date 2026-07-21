import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import {
  ResumeIndexSchema,
  ResumeSchema,
  type Resume,
  type ResumeIndex,
} from "@/lib/schema";
import { seedResume } from "@/lib/defaults";

const DATA_DIR = path.join(process.cwd(), "data");
const RESUMES_DIR = path.join(DATA_DIR, "resumes");
const BACKUPS_DIR = path.join(DATA_DIR, "backups");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const EXPORTS_DIR = path.join(process.cwd(), "exports");
const INDEX_FILE = path.join(DATA_DIR, "index.json");

const MAX_BACKUPS_PER_RESUME = 20;

async function ensureDirs() {
  await Promise.all(
    [RESUMES_DIR, BACKUPS_DIR, UPLOADS_DIR, EXPORTS_DIR].map((dir) =>
      fs.mkdir(dir, { recursive: true })
    )
  );
}

// Atomic write: write to a temp file in the same directory, then rename.
async function writeJsonAtomic(filePath: string, value: unknown) {
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

function resumeFile(id: string) {
  // ids are nanoid-generated; reject anything path-like defensively
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error(`Invalid resume id: ${id}`);
  return path.join(RESUMES_DIR, `${id}.json`);
}

export async function readIndex(): Promise<ResumeIndex> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(INDEX_FILE, "utf8");
    return ResumeIndexSchema.parse(JSON.parse(raw));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    // First run: seed a sample resume so every part of the app has data.
    const seed = seedResume();
    await writeJsonAtomic(resumeFile(seed.id), seed);
    const index: ResumeIndex = {
      version: 1,
      activeResumeId: seed.id,
      resumes: [indexEntry(seed)],
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

async function backupResume(id: string) {
  const src = resumeFile(id);
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await fs.copyFile(src, path.join(BACKUPS_DIR, `${id}-${stamp}.json`));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
    throw err;
  }
  // prune old backups for this resume
  const files = (await fs.readdir(BACKUPS_DIR))
    .filter((f) => f.startsWith(`${id}-`))
    .sort();
  const excess = files.length - MAX_BACKUPS_PER_RESUME;
  for (let i = 0; i < excess; i++) {
    await fs.unlink(path.join(BACKUPS_DIR, files[i]));
  }
}

export async function writeResume(resume: Resume): Promise<Resume> {
  const index = await readIndex();
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
  await backupResume(id);
  await fs.rm(resumeFile(id), { force: true });
  const resumes = index.resumes.filter((r) => r.id !== id);
  await writeIndex({
    ...index,
    resumes,
    activeResumeId:
      index.activeResumeId === id ? resumes[0]?.id ?? null : index.activeResumeId,
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
