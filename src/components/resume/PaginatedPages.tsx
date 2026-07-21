"use client";

// The measure→paginate→render pipeline. Blocks are rendered twice with
// identical classes, custom properties and column widths: once into a hidden
// off-screen container (measurement pass), then into discrete fixed-height
// A4 page boxes according to the paginator's assignment. Both the editor
// preview and the /print route render THIS component, so the page breaks the
// user sees are the page breaks Puppeteer prints.

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { Resume, ThemeTokens } from "@/lib/schema";
import { A4, mmToPx } from "@/lib/units";
import { buildFlows, type BlockDef } from "@/lib/pagination/blocks";
import { paginateFlow, type PageFlow } from "@/lib/pagination/paginate";
import { PageChromeOverlay } from "./PageChromeOverlay";

// Horizontal + vertical inner padding of the tinted side column (.pg-col--side).
const SIDE_PAD_MM = 4;

interface PageLayout {
  pageCount: number;
  main: PageFlow[];
  side: PageFlow[];
  overflowIds: Set<string>;
  freeMmByPage: number[];
}

export function PaginatedPages({
  resume,
  tokens,
  chrome,
  onSideWidthChange,
}: {
  resume: Resume;
  tokens: ThemeTokens;
  chrome: "screen" | "print";
  // Editor-only: live column-divider drag reporting a new side-column width
  // percent. Never passed on the print route.
  onSideWidthChange?: (percent: number) => void;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<PageLayout | null>(null);
  const [measureTick, setMeasureTick] = useState(0);

  const flows = useMemo(() => buildFlows(resume, tokens), [resume, tokens]);

  const geometry = useMemo(() => {
    const contentWmm =
      A4.widthMm - tokens.pageMarginMm.left - tokens.pageMarginMm.right;
    const contentHpx = mmToPx(
      A4.heightMm - tokens.pageMarginMm.top - tokens.pageMarginMm.bottom
    );
    const twoCol = resume.layout.mode === "two-column";
    let mainWmm = contentWmm;
    let sideWmm = 0;
    if (twoCol) {
      const available = contentWmm - tokens.columnGapMm;
      sideWmm = (available * resume.layout.sideColumnWidthPercent) / 100;
      mainWmm = available - sideWmm;
    }
    return { contentWmm, contentHpx, mainWmm, sideWmm, twoCol };
  }, [resume.layout, tokens]);

  // Measure + paginate. Gated on fonts and images so heights are final;
  // getBoundingClientRect gives fractional heights (the measurement container
  // must never sit inside a scaled wrapper — future zoom must scale only the
  // rendered pages).
  useLayoutEffect(() => {
    const container = measureRef.current;
    if (!container) return;
    let cancelled = false;

    const run = async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(container.querySelectorAll("img")).map((img) =>
          img.decode().catch(() => undefined)
        )
      );
      if (cancelled) return;

      const heights = new Map<string, number>();
      container.querySelectorAll<HTMLElement>("[data-mid]").forEach((el) => {
        heights.set(el.dataset.mid!, el.getBoundingClientRect().height);
      });

      const bannerH = flows.banner ? heights.get(flows.banner.id) ?? 0 : 0;
      const topReservePx = flows.banner
        ? bannerH + mmToPx(tokens.sectionGapMm)
        : 0;
      const mainHeightFor = (p: number) =>
        geometry.contentHpx - (p === 0 ? topReservePx : 0);
      const sideHeightFor = (p: number) =>
        mainHeightFor(p) - mmToPx(2 * SIDE_PAD_MM);

      const toFlowBlocks = (defs: BlockDef[]) =>
        defs.map((d) => ({
          id: d.id,
          heightPx: heights.get(d.id) ?? 0,
          gapBeforePx: mmToPx(d.gapBeforeMm),
          keepWithNext: d.keepWithNext,
        }));

      const main = paginateFlow(toFlowBlocks(flows.main), mainHeightFor);
      const side = geometry.twoCol
        ? paginateFlow(toFlowBlocks(flows.side), sideHeightFor)
        : { pages: [], overflowIds: [] };

      const pageCount = Math.max(main.pages.length, side.pages.length, 1);
      const freeMmByPage = Array.from({ length: pageCount }, (_, p) => {
        const free = mainHeightFor(p) - (main.pages[p]?.usedPx ?? 0);
        return Math.max(0, free / mmToPx(1));
      });

      if (!cancelled) {
        setLayout({
          pageCount,
          main: main.pages,
          side: side.pages,
          overflowIds: new Set([...main.overflowIds, ...side.overflowIds]),
          freeMmByPage,
        });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [flows, geometry, tokens.sectionGapMm, measureTick]);

  // Late size changes inside the measurement container (font swap, image
  // load) poke a re-measure.
  useLayoutEffect(() => {
    const container = measureRef.current;
    if (!container) return;
    let raf = 0;
    let first = true;
    const observer = new ResizeObserver(() => {
      if (first) {
        first = false; // initial observation, not a real resize
        return;
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setMeasureTick((t) => t + 1));
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [flows]);

  const blockById = useMemo(() => {
    const map = new Map<string, BlockDef>();
    for (const d of flows.main) map.set(d.id, d);
    for (const d of flows.side) map.set(d.id, d);
    if (flows.banner) map.set(flows.banner.id, flows.banner);
    return map;
  }, [flows]);

  const renderBlock = (
    d: BlockDef,
    marginTopPx: number,
    forMeasure = false
  ) => {
    const overflow =
      !forMeasure && chrome === "screen" && layout?.overflowIds.has(d.id);
    return (
      <div
        key={d.id}
        {...(forMeasure ? { "data-mid": d.id } : {})}
        className={`pg-block${overflow ? " pg-block--overflow" : ""}`}
        title={
          overflow
            ? "This block is taller than one page and will be clipped in the PDF — split it into smaller items or reduce its content."
            : undefined
        }
        style={{ ...d.vars, marginTop: `${marginTopPx}px` }}
      >
        {d.node}
      </div>
    );
  };

  // A page assignment can transiently reference blocks that no longer exist
  // (section just added/removed/undone: flows rebuild synchronously, the
  // re-measure that produces a fresh layout lands a frame later) — skip them.
  const renderFlowPage = (flowPage: PageFlow | undefined) =>
    flowPage?.blocks.map((pb) => {
      const def = blockById.get(pb.id);
      return def ? renderBlock(def, pb.marginTopPx) : null;
    }) ?? null;

  const sideFirst = resume.layout.sidePosition === "left";
  const columnsStyle: CSSProperties = geometry.twoCol
    ? {
        gridTemplateColumns: sideFirst
          ? `${geometry.sideWmm}mm ${geometry.mainWmm}mm`
          : `${geometry.mainWmm}mm ${geometry.sideWmm}mm`,
        columnGap: `${tokens.columnGapMm}mm`,
      }
    : { gridTemplateColumns: "1fr" };

  const sideCol = (flowPage: PageFlow | undefined) => (
    <div className="pg-col pg-col--side">{renderFlowPage(flowPage)}</div>
  );

  // Column divider drag: converts pointer movement (px) to mm and reports a
  // clamped side-width percent; the store update re-measures and re-paginates
  // live. rAF-throttled so a fast drag doesn't queue redundant layouts.
  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onSideWidthChange) return;
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    target.classList.add("pg-col-resizer--active");
    const startX = e.clientX;
    const startSideMm = geometry.sideWmm;
    const availableMm = geometry.contentWmm - tokens.columnGapMm;
    let raf = 0;
    const onMove = (ev: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const deltaMm = (ev.clientX - startX) / mmToPx(1);
        const nextSideMm = sideFirst ? startSideMm + deltaMm : startSideMm - deltaMm;
        const percent = Math.min(50, Math.max(20, (nextSideMm / availableMm) * 100));
        onSideWidthChange(Math.round(percent * 10) / 10);
      });
    };
    const onUp = () => {
      cancelAnimationFrame(raf);
      target.classList.remove("pg-col-resizer--active");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const resizer =
    chrome === "screen" && geometry.twoCol && onSideWidthChange ? (
      <div
        className="pg-col-resizer"
        title={`Side column: ${resume.layout.sideColumnWidthPercent}% — drag to resize`}
        style={{
          left: `calc(${sideFirst ? geometry.sideWmm : geometry.mainWmm}mm + ${
            tokens.columnGapMm / 2
          }mm)`,
        }}
        onPointerDown={startResize}
      />
    ) : null;

  return (
    <div
      className={`pg-pages pg-pages--${chrome}`}
      data-pagination-ready={layout ? "true" : undefined}
    >
      <div ref={measureRef} className="pg-measure" aria-hidden>
        {flows.banner && (
          <div style={{ width: `${geometry.contentWmm}mm` }}>
            {renderBlock(flows.banner, 0, true)}
          </div>
        )}
        <div className="pg-col" style={{ width: `${geometry.mainWmm}mm` }}>
          {flows.main.map((d) => renderBlock(d, 0, true))}
        </div>
        {geometry.twoCol && (
          <div
            className="pg-col pg-col--side"
            style={{ width: `${geometry.sideWmm}mm` }}
          >
            {flows.side.map((d) => renderBlock(d, 0, true))}
          </div>
        )}
      </div>

      {layout &&
        Array.from({ length: layout.pageCount }, (_, p) => (
          <div
            key={p}
            className={`pg-page pg-page--${chrome}`}
            data-page-index={p}
          >
            {p === 0 && flows.banner && renderBlock(flows.banner, 0)}
            <div
              className="pg-columns"
              style={{
                ...columnsStyle,
                marginTop:
                  p === 0 && flows.banner ? `${tokens.sectionGapMm}mm` : 0,
              }}
            >
              {geometry.twoCol && sideFirst && sideCol(layout.side[p])}
              <div className="pg-col">{renderFlowPage(layout.main[p])}</div>
              {geometry.twoCol && !sideFirst && sideCol(layout.side[p])}
              {resizer}
            </div>
            {chrome === "screen" && (
              <PageChromeOverlay
                pageIndex={p}
                pageCount={layout.pageCount}
                freeMm={layout.freeMmByPage[p]}
                marginBottomMm={tokens.pageMarginMm.bottom}
              />
            )}
          </div>
        ))}
    </div>
  );
}
