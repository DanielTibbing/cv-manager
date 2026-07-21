// Pure pagination: assigns measured blocks to discrete pages. No DOM, no CSS
// fragmentation heuristics — this arithmetic IS the page-break behaviour, and
// it is shared by the editor preview and the print route, which is what makes
// preview == PDF a structural guarantee.

export interface FlowBlock {
  id: string;
  heightPx: number;
  // Vertical gap before this block when it does NOT start a page. Gaps are
  // dropped at the top of a page (like word processors drop paragraph
  // spacing at page starts).
  gapBeforePx: number;
  // Glue this block to the next one (section title → first item), so a
  // heading is never orphaned at the bottom of a page.
  keepWithNext: boolean;
}

export interface PlacedBlock {
  id: string;
  marginTopPx: number;
}

export interface PageFlow {
  blocks: PlacedBlock[];
  usedPx: number;
}

export interface FlowResult {
  pages: PageFlow[];
  // Blocks taller than a whole empty page: placed alone and clipped; the
  // editor outlines them as a warning.
  overflowIds: string[];
}

function newPage(): PageFlow {
  return { blocks: [], usedPx: 0 };
}

// heightForPage lets page 0 differ (the profile banner reserves space there).
export function paginateFlow(
  blocks: FlowBlock[],
  heightForPage: (pageIndex: number) => number
): FlowResult {
  const pages: PageFlow[] = [newPage()];
  const overflowIds: string[] = [];

  const place = (block: FlowBlock, gapPx: number) => {
    const page = pages[pages.length - 1];
    page.blocks.push({ id: block.id, marginTopPx: gapPx });
    page.usedPx += gapPx + block.heightPx;
  };

  let i = 0;
  while (i < blocks.length) {
    // keep-with-next group: consecutive glued blocks plus the block after them
    let end = i;
    while (end < blocks.length - 1 && blocks[end].keepWithNext) end++;
    const group = blocks.slice(i, end + 1);

    const current = () => pages[pages.length - 1];
    const capacity = () => heightForPage(pages.length - 1);

    const groupHeight = (atPageTop: boolean) =>
      group.reduce(
        (sum, b, idx) =>
          sum + b.heightPx + (idx === 0 && atPageTop ? 0 : b.gapBeforePx),
        0
      );

    const cursor = current().usedPx;
    if (cursor > 0 && cursor + groupHeight(false) > capacity()) {
      pages.push(newPage());
    }

    if (current().usedPx === 0 && groupHeight(true) > capacity()) {
      // The glued group doesn't fit an empty page: break the glue and place
      // block by block, flagging any single block taller than a page.
      for (const block of group) {
        const atTop = current().usedPx === 0;
        const gap = atTop ? 0 : block.gapBeforePx;
        if (!atTop && current().usedPx + gap + block.heightPx > capacity()) {
          pages.push(newPage());
          if (block.heightPx > capacity()) overflowIds.push(block.id);
          place(block, 0);
        } else {
          if (atTop && block.heightPx > capacity()) overflowIds.push(block.id);
          place(block, gap);
        }
      }
    } else {
      group.forEach((block, idx) =>
        place(block, idx === 0 && current().usedPx === 0 ? 0 : block.gapBeforePx)
      );
    }
    i = end + 1;
  }

  return { pages, overflowIds };
}
