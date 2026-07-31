# CV Manager

Personal, single-user, **local-first** resume and cover-letter builder. Runs
entirely on your machine: data is JSON files on disk, the editor is a local
Next.js app, and PDF export renders through headless Chrome for pixel-faithful
A4 output.

## Quick start

```bash
pnpm install
pnpm dev          # → http://localhost:3000
```

First run seeds a sample resume. Data layout:

| Path | Contents |
|---|---|
| `data/index.json` | Resume + letter lists, and which resume is "active" |
| `data/resumes/{id}.json` | One resume document each (zod-validated, versioned) |
| `data/letters/{id}.json` | One personal letter each |
| `data/backups/` | Rolling backups, last 20 writes per document |
| `data/uploads/` | Profile photos |
| `exports/` | Generated PDFs |

## Desktop app (Electron)

The app can be bundled as a double-clickable desktop app (macOS, Windows,
Linux):

```bash
pnpm run dist        # next build → stage standalone server + Chromium → electron-builder
# output: dist/ (dmg on macOS, NSIS .exe on Windows, AppImage on Linux)
```

Builds are unsigned on purpose. Per platform, after installing:

- **macOS**: `xattr -cr "/Applications/CV Manager.app"` (once).
- **Windows**: click "More info → Run anyway" on the SmartScreen prompt.
- **Linux**: `chmod +x` the AppImage and run it.

Every push to `main` also builds all four variants (mac arm64, mac x64,
Windows, Linux) in GitHub Actions and attaches them to the rolling **Latest
build** prerelease under Releases, so other machines can just download
instead of building locally.

The packaged app runs the same Next.js server on a loopback port inside an
Electron window. Data lives in the platform user-data dir (e.g.
`~/Library/Application Support/cv-manager/` on macOS — `data/` and `exports/`
there override the repo paths via `CV_DATA_DIR` / `CV_EXPORTS_DIR`), and PDF
export uses a Chromium bundled in the app's resources.
`pnpm run electron:dev` gives the dev loop: `pnpm dev` plus an Electron window
attached to it.

## Moving data between machines

**Export data** (manager page, or `GET /api/backup`) downloads a zip of all
resumes, letters, uploads, and the index — drop it in Google Drive or
wherever. **Import data** merges such a zip into the current data,
OS-copy-style:

- items whose name doesn't exist locally are added;
- items with the same name *and* same `updatedAt` are the same item — skipped;
- same name but a different `updatedAt` is a conflict — you pick per item:
  keep existing, use imported, or keep both.

Letter→resume links are rewired to the right local resumes (including
keep-both copies), the index is rebuilt, and a full pre-import snapshot is
saved to `data/backups/pre-import-<timestamp>.zip` before anything is
written. Archives are validated strictly (path allow-list, zod schemas) — a
bad zip is rejected with a 400 and changes nothing.

## Personal letters

Cover letters live beside resumes and **inherit their entire visual identity
from a linked resume** — same fonts, colors, and header (full banner or a
compact photo-less variant) — so an application reads as one package. The
workflow is built for volume: write one generic letter with `{{company}}` /
`{{role}}` placeholders and mark it as a *base*; "New letter" then copies the
base, fills the placeholders from the application's company/role fields, and
opens the editor with the pasted job description in a reference panel beside
the text. Letters carry a lightweight application status
(draft → sent → interview → offer/rejected) and the letters list is
searchable/filterable. Exports are blocked while placeholders are unfilled,
so a template artifact can never reach a PDF. Letter saves (and resume-editor
saves) carry a base-version header; a stale tab gets a 409 and a "reload to
continue" banner instead of silently overwriting newer edits.

## How PDF fidelity works

The editor preview and the export pipeline render **the same React components,
the same CSS, in the same engine (Chromium)**. "Export PDF" calls
`POST /api/export/{id}`, which drives Puppeteer to `/print/{id}` and writes the
PDF to `exports/`. All resume dimensions are in `mm`/`pt`, webfonts are
self-hosted (`next/font`, `display: block`), and the exporter waits for
`document.fonts.ready` + image decode before capturing. The theme inspector
also offers Avenir and Helvetica as macOS system fonts — deterministic here
because preview and export render on the same machine (Chrome embeds the
subsetted system font into the PDF), but a resume using them won't look
identical on another OS; Nunito Sans and Arimo are the portable lookalikes.

Page breaks are computed by our own deterministic paginator, never by
Chrome's fragmentation heuristics: every atomic block (section title, job
entry, skill group…) is rendered into a hidden measurement container, a pure
function (`src/lib/pagination/paginate.ts`) assigns blocks to discrete
fixed-height A4 `.pg-page` boxes (section titles glued to their first item,
items never split), and both the editor preview and `/print` render those
same pages. The editor therefore shows *exact* page boundaries, a
bottom-margin guide band, and a per-page "N mm free" readout; blocks taller
than a page get a red warning outline. `scripts/parity-check.mjs` proves the
guarantee by pixel-diffing exported PDF pages against preview screenshots
(gate: <0.5% per page; measured: ≤0.012%).

## Development roadmap

- [x] Phase 0 — schema (`src/lib/schema.ts`), atomic storage + backups, CRUD API
- [x] Phase 1 — token-driven resume renderer (`src/components/resume/`, `src/styles/resume.css`)
- [x] Phase 2 — one-click Puppeteer PDF export (`src/lib/pdf/exporter.ts`)
- [x] Editor shell — zustand store (undo/redo + debounced autosave), dnd-kit
      section reordering behind the `SortableColumns` adapter, manager page
- [x] Phase 3 — deterministic pagination engine (`src/lib/pagination/`), editor page-break
      preview (`PageChromeOverlay`), PDF↔preview parity harness (all fixtures ≤0.012% diff)
- [x] Phase 4 — content editing forms for all section kinds + profile/contacts
      (`src/components/editor/forms/`), photo upload with shape/size controls
      (`PhotoUploader`), add/remove/hide/reorder for sections and items,
      keystroke-grouped undo history
- [x] Phase 5 — single↔two-column mode toggle (side sections fold into main),
      sidebar position + header placement controls (`LayoutControls`), draggable
      column divider in the preview (cross-column section DnD landed in the shell)
- [x] Phase 6 — TemplatePicker with non-destructive switching (content survives, theme
      tweaks reset with confirm), per-section SpacingInspector (mm/pt/line-height
      overrides with reset-to-template), ThemeInspector (fonts, sizes, colors, page
      margins, spacing) — parity fixtures now cover all four templates
- [x] Phase 7 — export toast with Reveal in Finder (`/api/reveal`, exports/-scoped,
      macOS), rename on the manager page, overflow-warning tooltips, empty states

All roadmap phases are complete.

## Dev smoke tests (require `pnpm dev` in another terminal)

```bash
node scripts/editor-smoke.mjs <resumeId>   # editor loads, no client errors, autosave fires
node scripts/dnd-smoke.mjs <resumeId>      # drag-reorder persists to disk
node scripts/parity-check.mjs [--keep]     # pixel-diffs exported PDFs vs preview for the
                                           # active resume + 6 resume fixtures + 4 letter
                                           # fixtures (one-page, multi-page, compact header,
                                           # two-column tokens), and asserts unfilled
                                           # placeholders block export (400)
```

## Architecture notes

- **Style cascade:** template tokens → per-resume `themeOverrides` → per-section
  `style` overrides, all expressed as CSS custom properties (`--rs-*` on the
  document root, `--sec-*` inline per section). One mechanism for screen and print.
- **Template switching is non-destructive:** content is never touched; section
  ids are re-slotted between columns (`src/lib/templates/index.ts#applyTemplate`).
- **DnD is isolated:** only `src/components/editor/dnd/SortableColumns.tsx`
  knows about dnd-kit; everything else calls `onMove(sectionId, column, index)`.
