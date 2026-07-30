# AGENTS.md — CV Manager

Guidance for AI coding agents working in this repository. Assumes no prior
knowledge of the project.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project overview

Personal, single-user, **local-first** resume and cover-letter builder. It runs
entirely on the owner's machine: data is JSON files on disk (no database, no
auth, no network service), the editor is a local Next.js app, and PDF export
renders through headless Chrome (Puppeteer) for pixel-faithful A4 output.

Core domain concepts:

- **Resumes** — one JSON document each in `data/resumes/{id}.json`, validated
  by zod schemas in `src/lib/schema.ts`. Rendered from one of four templates
  (`modern`, `classic`, `minimalist`, `two-column`).
- **Letters** (cover letters) — in `data/letters/{id}.json`. A letter is linked
  to a resume and inherits its entire visual identity (fonts, colors, header).
  Letters support `{{company}}` / `{{role}}` placeholders: one letter can be
  marked as a *base*, and "New letter" copies the base with placeholders
  filled. Export is blocked (HTTP 400) while placeholders are unfilled.
- **Index** — `data/index.json` lists resumes and letters and marks the active
  resume.

## Technology stack

- **Next.js 16.2.11** (App Router) with **React 19** and **TypeScript 5**
  (strict mode). Path alias `@/*` → `./src/*`.
- **Tailwind CSS v4** via `@tailwindcss/postcss` (PostCSS plugin, no
  `tailwind.config` file).
- **zustand 5** (+ immer middleware, **zundo** for undo/redo) for editor
  client state.
- **@dnd-kit** for drag-and-drop section reordering.
- **zod 4** for document schemas and request validation.
- **puppeteer** for PDF export; **nanoid** for ids; **server-only** to fence
  server modules.
- Dev-only PDF tooling: `pdfjs-dist`, `pixelmatch`, `@napi-rs/canvas` (used by
  the parity harness).

## Build and run commands

```bash
npm install
npm run dev      # dev server → http://localhost:3000 (first run seeds a sample resume)
npm run build    # production build
npm run start    # production server
npm run lint     # eslint (eslint-config-next core-web-vitals + typescript)
npm run electron:dev  # next dev + Electron window attached to it
npm run dist     # build the unsigned macOS .app/.dmg into dist/ (see README → Desktop app)
```

There is no unit-test runner configured. Verification is done via the smoke
scripts below plus `npm run lint` and `npm run build` (type-checks).

## Testing instructions

There are no unit tests. The project uses **smoke/parity scripts that require
`npm run dev` running in another terminal**:

```bash
node scripts/editor-smoke.mjs <resumeId>   # editor loads, no client errors, autosave fires
node scripts/dnd-smoke.mjs <resumeId>      # drag-reorder persists to disk
node scripts/parity-check.mjs [--keep]     # pixel-diffs exported PDFs vs preview screenshots
```

`parity-check.mjs` is the correctness gate for anything touching rendering,
pagination, templates, or export: it diffs exported PDF pages against preview
screenshots for the active resume plus resume and letter fixtures (one-page,
multi-page, compact header, two-column). The gate is **<0.5% pixel diff per
page** (currently measured ≤0.012%); it also asserts that unfilled letter
placeholders block export with 400. Harness output goes to `parity-out/`
(gitignored).

## Code organization

```
src/
  app/                     # Next.js App Router
    page.tsx               # manager page (lists resumes/letters, rename, duplicate)
    editor/[id]/           # resume editor
    editor/letter/[id]/    # letter editor
    print/[id]/, print/letter/[id]/  # bare render routes used by the PDF exporter
    api/                   # REST routes: resumes, letters, export, uploads, active, reveal,
                           # backup (zip export + merge-import)
  components/
    resume/                # token-driven renderer: blocks/, PaginatedPages, PageChromeOverlay
    editor/                # EditorShell, forms/ (per-section-kind editing), inspector/
                           # (TemplatePicker, ThemeInspector, SpacingInspector),
                           # LayoutControls, PhotoUploader, dnd/SortableColumns
    letter/                # LetterDocument, LetterEditorShell
    manager/               # LetterList, ImportData (merge-import UI)
  lib/
    schema.ts              # zod schemas: ThemeTokens, Resume, Letter, index (single source of truth)
    storage.ts             # server-only JSON file storage: atomic writes, rolling backups
    backup.ts              # server-only zip export + merge-import (analyze/apply)
    backup-types.ts        # import/export types shared with client components
    templates/             # the 4 templates + applyTemplate() re-slotting logic
    pagination/            # paginate.ts (pure page-break arithmetic) + block measurement
    pdf/exporter.ts        # server-only Puppeteer pipeline
    letters/placeholders   # {{company}}/{{role}} placeholder handling
    defaults.ts, units.ts
  store/                   # zustand editor stores (resumeStore, letterStore)
  styles/                  # resume.css (token cascade), print.css
electron/                  # Electron main process (main.cjs, plain CommonJS — eslint-ignored)
data/                      # user data (gitignored): resumes/, letters/, backups/, uploads/, index.json
exports/                   # generated PDFs (gitignored)
scripts/                   # dev smoke/parity harnesses + electron-dev/prepare-standalone (plain node .mjs)
electron-builder.yml       # unsigned macOS packaging config (dmg → dist/, gitignored).
                           # Gotcha: electron-builder strips top-level node_modules from
                           # extraResources, so prepare-standalone stages the server as
                           # build/app-server with node_modules renamed to vendor/, and
                           # electron/main.cjs sets NODE_PATH to it when forking.
```

## Architecture invariants — do not break these

- **Preview == PDF is a structural guarantee.** The editor preview, the
  `/print` routes, and the export pipeline render the same React components
  with the same CSS in the same engine (Chromium). Never fork rendering logic
  between preview and print; change shared components instead.
- **Page breaks are computed, not discovered.** `src/lib/pagination/paginate.ts`
  is a pure function that assigns measured blocks to discrete fixed-height A4
  `.pg-page` boxes (section titles glued to their first item via
  `keepWithNext`, items never split, top-of-page gaps dropped). Never rely on
  Chrome/CSS fragmentation heuristics for page breaks.
- **All resume dimensions are in `mm`/`pt`** (see `src/lib/units.ts`); webfonts
  are self-hosted via `next/font` with `display: block`, and the exporter waits
  for `document.fonts.ready` plus image decode before capturing.
- **Style cascade:** template tokens → per-resume `themeOverrides` →
  per-section `style` overrides, all expressed as CSS custom properties
  (`--rs-*` on the document root, `--sec-*` inline per section). One mechanism
  serves both screen and print — keep it that way.
- **Template switching is non-destructive.** Content is never touched; section
  ids are re-slotted between columns (`src/lib/templates/index.ts`,
  `applyTemplate`).
- **DnD is isolated.** Only `src/components/editor/dnd/SortableColumns.tsx`
  imports dnd-kit; everything else calls `onMove(sectionId, column, index)`.
- **Optimistic concurrency.** Saves carry a base-version (`updatedAt`) header;
  a stale writer gets a `ConflictError` → HTTP 409, and the UI shows a
  "reload to continue" banner. The stores track `serverUpdatedAt` for this.
- **`next.config.ts` sets `devIndicators: false` deliberately** — `/print`
  must render nothing but the document because the parity harness screenshots
  it. Do not re-enable dev indicators.

## Data storage and API conventions

- `src/lib/storage.ts` and `src/lib/pdf/exporter.ts` are server-only
  (`import "server-only"`). Keep filesystem and Puppeteer code out of client
  bundles.
- Storage paths (`data/`, `exports/`) honor the `CV_DATA_DIR` / `CV_EXPORTS_DIR`
  env overrides; the Electron shell sets them to the app's user-data dir. The
  exporter likewise honors `PUPPETEER_EXECUTABLE_PATH` (bundled Chromium in the
  packaged app). Defaults are unchanged repo-relative paths — keep the static
  `path.join(process.cwd(), "…")` fallback shape, bundler file tracing keys off
  it.
- **Backup import is a merge, not a restore** (`src/lib/backup.ts`): documents
  match by name; identical name + `updatedAt` is skipped; same name with
  different `updatedAt` is a user-resolved conflict (keep existing / use
  imported / keep both). Imported documents are written *verbatim* (never via
  writeResume/writeLetter, which would re-stamp `updatedAt` and break
  skip-detection), letter `resumeId`s are remapped to final local resume ids,
  and `index.json` is rebuilt from the documents on disk. Every apply first
  writes a full snapshot to `data/backups/pre-import-<timestamp>.zip`.
- Backup archives are hardened: zip entry paths must match an allow-list
  (zip-slip safe), every document passes its zod schema, and any failure
  rejects the whole import with 400 before anything is written.
- Writes are **atomic**: temp file in the same directory, then rename. Every
  write first saves a rolling backup to `data/backups/` (last 20 per document).
- Document ids are nanoid-generated and defensively validated
  (`/^[A-Za-z0-9_-]+$/`) before being used in file paths.
- API routes validate request bodies with the zod schemas from
  `src/lib/schema.ts` and return 400 on schema mismatch or id mismatch, 404 on
  missing documents, 409 on version conflict.
- The exporter keeps a warm singleton Chromium on `globalThis` to survive
  Next.js dev-mode module reloads (repeat exports take ~1s).
- `/api/reveal` (macOS "Reveal in Finder") is scoped to `exports/` only.

## Code style guidelines

- TypeScript strict mode; React 19 function components; `"use client"` only
  where client interactivity requires it (editor shells, stores).
- Heavy logic lives in `src/lib/` as plain, testable modules; components stay
  thin. Pagination and schema code are deliberately pure/DOM-free.
- Comments explain *why*, especially invariants (see the header comments in
  `paginate.ts`, `exporter.ts`, `storage.ts` for the expected tone).
- Match the existing style: 2-space indent, double quotes, named exports for
  lib modules.
- The project README (`README.md`) documents user-facing behavior and the
  architecture notes above in more depth; keep it in sync when changing
  behavior.

## Security considerations

- This is a **single-user local app**: no auth, no multi-tenancy, no secrets,
  no `.env` required. Do not add network calls, telemetry, or external
  services.
- `data/`, `exports/`, and `parity-out/` contain the user's personal documents
  and are gitignored — never commit them or read them into patches.
- Preserve the existing input hardening: zod validation on all API bodies,
  strict id validation before path construction, and the `exports/`-only scope
  of `/api/reveal`. Photo uploads go only to `data/uploads/`.
