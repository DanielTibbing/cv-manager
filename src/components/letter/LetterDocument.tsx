"use client";

import { useMemo } from "react";
import type { Layout, Letter, Resume } from "@/lib/schema";
import { resolveLetterStyle, tokensToCssVars } from "@/lib/templates";
import { buildLetterFlows } from "@/lib/pagination/letterBlocks";
import { PaginatedPages } from "@/components/resume/PaginatedPages";

// Letters are always a single column, but the tokens (and therefore fonts,
// colors, margins, header identity) come from the linked resume — the same
// resolution and CSS-variable pipeline the resume itself renders with.
const LETTER_LAYOUT: Layout = {
  mode: "single",
  columns: { main: [], side: [] },
  sideColumnWidthPercent: 30,
  sidePosition: "right",
  headerPlacement: "banner",
};

export function LetterDocument({
  letter,
  resume,
  chrome,
}: {
  letter: Letter;
  resume: Resume | null;
  chrome: "screen" | "print";
}) {
  const { tokens, profile } = useMemo(
    () => resolveLetterStyle(letter, resume),
    [letter, resume]
  );
  const flows = useMemo(
    () => buildLetterFlows(letter, profile, tokens),
    [letter, profile, tokens]
  );

  return (
    <div
      className="resume-root"
      data-letter-id={letter.id}
      style={tokensToCssVars(tokens)}
    >
      <PaginatedPages
        flows={flows}
        layout={LETTER_LAYOUT}
        tokens={tokens}
        chrome={chrome}
      />
    </div>
  );
}
