// Dev smoke test: drags the first section card below the second and checks
// that the new order lands in data/resumes/{id}.json via autosave.
// Usage: node scripts/dnd-smoke.mjs <resumeId>
import puppeteer from "puppeteer";

const resumeId = process.argv[2];
if (!resumeId) {
  console.error("Usage: node scripts/dnd-smoke.mjs <resumeId>");
  process.exit(1);
}

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000 });
await page.goto(`http://localhost:3000/editor/${resumeId}`, {
  waitUntil: "networkidle0",
});
await page.waitForSelector("aside .cursor-grab");

const order = () =>
  page.$$eval("aside .cursor-grab", (els) =>
    els.map((el) => el.querySelector(".text-sm")?.textContent)
  );

const before = await order();
const cards = await page.$$("aside .cursor-grab");
const a = await cards[0].boundingBox();
const b = await cards[1].boundingBox();

// Drag card 0 to just below card 1 (smooth move so the 4px activation
// constraint and dnd-kit's collision detection both engage).
await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
await page.mouse.down();
await page.mouse.move(a.x + a.width / 2, b.y + b.height, { steps: 20 });
await page.mouse.up();

await new Promise((r) => setTimeout(r, 2000)); // autosave debounce
const after = await order();

const res = await fetch(`http://localhost:3000/api/resumes/${resumeId}`);
const saved = await res.json();
const sectionTitle = new Map(saved.sections.map((s) => [s.id, s.title]));
const persisted = saved.layout.columns.main.map((id) => sectionTitle.get(id));

console.log(JSON.stringify({ before, after, persisted }, null, 2));
await browser.close();
