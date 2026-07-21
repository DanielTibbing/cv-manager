import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import puppeteer, { type Browser } from "puppeteer";
import { EXPORTS_DIR, readResume } from "@/lib/storage";

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
      .replace(/^-+|-+$/g, "") || "resume"
  );
}

export async function exportResumePdf(
  id: string,
  origin: string
): Promise<{ fileName: string; filePath: string }> {
  const resume = await readResume(id);
  if (!resume) throw new Error(`Resume not found: ${id}`);

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(`${origin}/print/${id}`, { waitUntil: "networkidle0" });
    // The paginator sets this flag only after fonts are loaded, images are
    // decoded, blocks are measured and the discrete pages are rendered.
    await page.waitForSelector('[data-pagination-ready="true"]', {
      timeout: 15_000,
    });
    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
    });

    await fs.mkdir(EXPORTS_DIR, { recursive: true });
    const stamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[T:]/g, "-");
    const fileName = `${slugify(resume.name)}-${stamp}.pdf`;
    const filePath = path.join(EXPORTS_DIR, fileName);
    await fs.writeFile(filePath, pdf);
    return { fileName, filePath };
  } finally {
    await page.close();
  }
}
