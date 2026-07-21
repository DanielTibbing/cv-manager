"use client";

// Editor-only page guides: a translucent band over the bottom-margin danger
// zone and a per-page readout of remaining space, so density can be tuned
// against real page boundaries before exporting.
export function PageChromeOverlay({
  pageIndex,
  pageCount,
  freeMm,
  marginBottomMm,
}: {
  pageIndex: number;
  pageCount: number;
  freeMm: number;
  marginBottomMm: number;
}) {
  return (
    <>
      <div className="pg-overlay-band" style={{ height: `${marginBottomMm}mm` }} />
      <div className="pg-overlay-badge">
        Page {pageIndex + 1}/{pageCount} · {Math.round(freeMm)} mm free
      </div>
    </>
  );
}
