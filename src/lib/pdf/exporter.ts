import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import puppeteer, { type Browser } from "puppeteer";
import { EXPORTS_DIR, readLetter, readResume } from "@/lib/storage";
import { findMissing } from "@/lib/letters/placeholders";

// Warm singleton browser so repeat exports take ~1s. Stored on globalThis to
// survive Next.js dev-mode module reloads.
const g = globalThis as unknown as { __cvBrowser?: Promise<Browser> };

async function getBrowser(): Promise<Browser> {
  if (g.__cvBrowser) {
    const browser = await g.__cvBrowser.catch(() => null);
    if (browser?.connected) return browser;
  }
  g.__cvBrowser = puppeteer.launch({ headless: true });
  return g.__cvBrowser;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "document"
  );
}

// Shared pipeline: navigate, wait for the deterministic paginator to settle
// (it gates on fonts + image decode itself), print, write to exports/.
async function exportPdfFromUrl(
  url: string,
  baseName: string
): Promise<{ fileName: string; filePath: string }> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForSelector('[data-pagination-ready="true"]', {
      timeout: 15_000,
    });
    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
    });

    await fs.mkdir(EXPORTS_DIR, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    const fileName = `${slugify(baseName)}-${stamp}.pdf`;
    const filePath = path.join(EXPORTS_DIR, fileName);
    await fs.writeFile(filePath, pdf);
    return { fileName, filePath };
  } finally {
    await page.close();
  }
}

export async function exportResumePdf(
  id: string,
  origin: string
): Promise<{ fileName: string; filePath: string }> {
  const resume = await readResume(id);
  if (!resume) throw new Error(`Resume not found: ${id}`);
  return exportPdfFromUrl(`${origin}/print/${id}`, resume.name);
}

export class UnresolvedPlaceholdersError extends Error {
  constructor(public keys: string[]) {
    super(`Unresolved placeholders: ${keys.join(", ")}`);
  }
}

export async function exportLetterPdf(
  id: string,
  origin: string
): Promise<{ fileName: string; filePath: string }> {
  const letter = await readLetter(id);
  if (!letter) throw new Error(`Letter not found: ${id}`);
  // A half-filled letter must never become a PDF.
  const missing = findMissing(letter);
  if (missing.length) throw new UnresolvedPlaceholdersError(missing);
  return exportPdfFromUrl(
    `${origin}/print/letter/${id}`,
    `letter-${letter.company || letter.name}`
  );
}
