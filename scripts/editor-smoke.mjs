// Dev smoke test: loads the editor against a running `pnpm dev`,
// checks for client errors, exercises autosave, and saves a screenshot.
// Usage: node scripts/editor-smoke.mjs <resumeId> [screenshotPath]
import puppeteer from "puppeteer";

const resumeId = process.argv[2];
const screenshotPath = process.argv[3] ?? "editor-smoke.png";
if (!resumeId) {
  console.error("Usage: node scripts/editor-smoke.mjs <resumeId>");
  process.exit(1);
}

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000 });

const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto(`http://localhost:3000/editor/${resumeId}`, {
  waitUntil: "networkidle0",
});
await page.waitForSelector('[data-pagination-ready="true"]', { timeout: 10000 });

const sectionCards = await page.$$eval(
  'aside [title="Drag to reorder"]',
  (els) => els.length
);

// Edit the resume name and confirm the debounced autosave fires.
await page.click("header input");
await page.keyboard.press("End");
await page.keyboard.type(" (edited)");
await new Promise((r) => setTimeout(r, 2000));
const saveLabel = await page.$eval("header span", (el) => el.textContent);

await page.screenshot({ path: screenshotPath });

console.log(JSON.stringify({ sectionCards, saveLabel, consoleErrors: errors }, null, 2));
await browser.close();
