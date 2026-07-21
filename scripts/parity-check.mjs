// Parity harness: proves the editor/print preview and the exported PDF are
// the same document. For the active resume plus three stress fixtures it
//   1. exports a PDF through the real /api/export pipeline,
//   2. rasterizes each PDF page (pdfjs-dist + @napi-rs/canvas),
//   3. screenshots each preview .pg-page on /print/{id} at matching scale,
//   4. pixel-diffs the pairs (pixelmatch) and asserts page counts match.
// Fails (exit 1) if any page differs by more than MAX_DIFF_PCT.
//
// Requires `npm run dev` on :3000. Usage:
//   node scripts/parity-check.mjs [--keep]   (--keep leaves fixtures + diff PNGs)

import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import pixelmatch from "pixelmatch";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const BASE = "http://localhost:3000";
const MAX_DIFF_PCT = 0.5;
const SCALE = 2; // devicePixels per CSS px; PDF is rasterized to match
const OUT_DIR = "parity-out";
const KEEP = process.argv.includes("--keep");

// ---------- fixtures ----------

const LONG_BULLET =
  "Delivered a cross-team initiative that required coordinating three platform squads, rewriting the ingestion layer for correctness under partial failure, and documenting the operational runbook so the on-call rotation could support it without escalation.";

const uid = (() => {
  let n = 0;
  return (p) => `${p}-${++n}`;
})();

function experienceSection(itemCount, bulletCount) {
  return {
    id: uid("sec"),
    kind: "experience",
    title: "Experience",
    visible: true,
    items: Array.from({ length: itemCount }, (_, i) => ({
      id: uid("item"),
      role: `Senior Engineer ${i + 1}`,
      company: `Company ${i + 1}`,
      location: "Stockholm, Sweden",
      startDate: `20${10 + i}-03`,
      endDate: `20${11 + i}-06`,
      summary:
        "Owned the platform end to end across design, delivery and operations.",
      bullets: Array.from(
        { length: bulletCount },
        (_, b) => `(${b + 1}) ${LONG_BULLET}`
      ),
      visible: true,
    })),
  };
}

function oversizedCustomSection(lineCount) {
  return {
    id: uid("sec"),
    kind: "custom",
    title: "Oversized Block",
    visible: true,
    items: [
      {
        id: uid("item"),
        heading: "One block taller than a page",
        body: Array.from(
          { length: lineCount },
          (_, i) => `- Line ${i + 1}: ${LONG_BULLET}`
        ).join("\n"),
        visible: true,
      },
    ],
  };
}

function skillsSection(groupCount, skillsPerGroup) {
  return {
    id: uid("sec"),
    kind: "skills",
    title: "Skills",
    visible: true,
    display: "groups",
    groups: Array.from({ length: groupCount }, (_, g) => ({
      id: uid("grp"),
      name: `Group ${g + 1}`,
      skills: Array.from({ length: skillsPerGroup }, (_, s) => ({
        id: uid("skill"),
        name: `Skill ${g + 1}.${s + 1}`,
      })),
    })),
  };
}

function educationSection(itemCount) {
  return {
    id: uid("sec"),
    kind: "education",
    title: "Education",
    visible: true,
    items: Array.from({ length: itemCount }, (_, i) => ({
      id: uid("item"),
      degree: `Degree ${i + 1}`,
      institution: `Institution ${i + 1}`,
      location: "Stockholm, Sweden",
      startDate: `${2000 + i}`,
      endDate: `${2004 + i}`,
      details: "Focus on distributed systems and human-computer interaction.",
      visible: true,
    })),
  };
}

// Each fixture mutates a freshly created resume (valid id + timestamps).
const FIXTURES = [
  {
    name: "long-bullets",
    mutate(resume) {
      const sections = [experienceSection(6, 8)];
      resume.sections = sections;
      resume.layout.columns = { main: sections.map((s) => s.id), side: [] };
    },
  },
  {
    name: "tiny-margins",
    mutate(resume) {
      const sections = [experienceSection(4, 6)];
      resume.sections = sections;
      resume.layout.columns = { main: sections.map((s) => s.id), side: [] };
      resume.themeOverrides = {
        pageMarginMm: { top: 6, right: 8, bottom: 6, left: 8 },
        sectionGapMm: 3,
      };
    },
  },
  {
    name: "oversized-block",
    mutate(resume) {
      const sections = [oversizedCustomSection(80)];
      resume.sections = sections;
      resume.layout.columns = { main: sections.map((s) => s.id), side: [] };
    },
  },
  {
    // Independent per-column flows: the side column (skills + education) must
    // continue on page 2's side column, with the tinted background bleeding
    // the full height of every page.
    name: "two-column",
    templateId: "two-column",
    mutate(resume) {
      const exp = experienceSection(5, 7);
      const skills = skillsSection(8, 6);
      const edu = educationSection(6);
      resume.sections = [exp, skills, edu];
      resume.layout.columns = { main: [exp.id], side: [skills.id, edu.id] };
    },
  },
  // Remaining templates, so every template's fonts (incl. Source Serif) and
  // title styles stay parity-covered.
  {
    name: "classic",
    templateId: "classic",
    mutate(resume) {
      const sections = [experienceSection(4, 6), educationSection(3)];
      resume.sections = sections;
      resume.layout.columns = { main: sections.map((s) => s.id), side: [] };
    },
  },
  {
    name: "minimalist",
    templateId: "minimalist",
    mutate(resume) {
      const sections = [experienceSection(4, 6), skillsSection(4, 6)];
      resume.sections = sections;
      resume.layout.columns = { main: sections.map((s) => s.id), side: [] };
    },
  },
];

// ---------- helpers ----------

async function api(method, url, body) {
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${method} ${url} → ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function rasterizePdf(filePath) {
  const data = new Uint8Array(await fs.readFile(filePath));
  const doc = await getDocument({ data }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    // PDF pt → CSS px is 96/72; multiply by SCALE for device pixels.
    const viewport = page.getViewport({ scale: (96 / 72) * SCALE });
    const canvas = createCanvas(
      Math.round(viewport.width),
      Math.round(viewport.height)
    );
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    pages.push(canvas);
  }
  await doc.cleanup?.();
  return pages;
}

async function screenshotPreviewPages(browser, resumeId) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1000, height: 1400, deviceScaleFactor: SCALE });
    await page.goto(`${BASE}/print/${resumeId}`, { waitUntil: "networkidle0" });
    await page.waitForSelector('[data-pagination-ready="true"]', {
      timeout: 15_000,
    });
    // A4 is 1122.52 CSS px tall, so in the scrolling preview page N starts at
    // a fractional CSS position while the PDF resets every page to an exact
    // origin — Chrome then rasterizes the same glyphs at a different subpixel
    // phase. Snap page heights to whole CSS pixels before screenshotting so
    // every page top (and everything inside) sits at integer positions; the
    // sub-pixel of extra height at each page bottom is cropped by the diff.
    await page.evaluate(() => {
      document.querySelectorAll(".pg-page").forEach((el) => {
        el.style.height = `${Math.round(el.getBoundingClientRect().height)}px`;
      });
    });
    const shots = [];
    for (const el of await page.$$(".pg-page")) {
      shots.push(await el.screenshot({ type: "png" }));
    }
    return shots;
  } finally {
    await page.close();
  }
}

function canvasToRgba(canvas) {
  const ctx = canvas.getContext("2d");
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

async function pngToCanvas(buffer) {
  const img = await loadImage(buffer);
  const canvas = createCanvas(img.width, img.height);
  canvas.getContext("2d").drawImage(img, 0, 0);
  return canvas;
}

function cropTo(canvas, w, h) {
  if (canvas.width === w && canvas.height === h) return canvas;
  const out = createCanvas(w, h);
  out.getContext("2d").drawImage(canvas, 0, 0);
  return out;
}

async function comparePage(pdfCanvas, shotBuffer, diffPath) {
  const shotCanvas = await pngToCanvas(shotBuffer);
  const w = Math.min(pdfCanvas.width, shotCanvas.width);
  const h = Math.min(pdfCanvas.height, shotCanvas.height);
  const a = canvasToRgba(cropTo(pdfCanvas, w, h));
  const b = canvasToRgba(cropTo(shotCanvas, w, h));
  const diffCanvas = createCanvas(w, h);
  const diffImage = diffCanvas.getContext("2d").createImageData(w, h);
  const diffPixels = pixelmatch(a, b, diffImage.data, w, h, { threshold: 0.16 });
  const pct = (diffPixels / (w * h)) * 100;
  if (pct > MAX_DIFF_PCT || KEEP) {
    diffCanvas.getContext("2d").putImageData(diffImage, 0, 0);
    await fs.writeFile(diffPath, diffCanvas.toBuffer("image/png"));
  }
  return pct;
}

// ---------- main ----------

await fs.mkdir(OUT_DIR, { recursive: true });
const browser = await puppeteer.launch({ headless: true });
const createdIds = [];
let failed = false;

try {
  const index = await api("GET", "/api/resumes");
  const targets = [{ name: "active-resume", id: index.activeResumeId }];

  for (const fixture of FIXTURES) {
    const created = await api("POST", "/api/resumes", {
      name: `parity ${fixture.name}`,
      templateId: fixture.templateId,
    });
    createdIds.push(created.id);
    fixture.mutate(created);
    await api("PUT", `/api/resumes/${created.id}`, created);
    targets.push({ name: fixture.name, id: created.id });
  }

  for (const target of targets) {
    const { filePath } = await api("POST", `/api/export/${target.id}`);
    const [pdfPages, shots] = await Promise.all([
      rasterizePdf(filePath),
      screenshotPreviewPages(browser, target.id),
    ]);

    if (pdfPages.length !== shots.length) {
      console.error(
        `✗ ${target.name}: page count mismatch — PDF ${pdfPages.length} vs preview ${shots.length}`
      );
      failed = true;
      continue;
    }

    for (let p = 0; p < pdfPages.length; p++) {
      const diffPath = path.join(OUT_DIR, `${target.name}-p${p + 1}-diff.png`);
      const pct = await comparePage(pdfPages[p], shots[p], diffPath);
      const ok = pct <= MAX_DIFF_PCT;
      if (!ok) failed = true;
      console.log(
        `${ok ? "✓" : "✗"} ${target.name} page ${p + 1}/${pdfPages.length}: ${pct.toFixed(3)}% diff${ok ? "" : ` (> ${MAX_DIFF_PCT}%, see ${diffPath})`}`
      );
    }
    if (!KEEP) await fs.rm(filePath, { force: true });
  }
} finally {
  await browser.close();
  if (!KEEP) {
    for (const id of createdIds) {
      await api("DELETE", `/api/resumes/${id}`).catch(() => undefined);
    }
  }
}

console.log(failed ? "\nPARITY: FAILED" : "\nPARITY: OK");
process.exit(failed ? 1 : 0);
