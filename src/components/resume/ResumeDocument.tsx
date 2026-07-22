"use client";

import { useMemo } from "react";
import type { Resume } from "@/lib/schema";
import { resolveTokens, tokensToCssVars } from "@/lib/templates";
import { buildFlows } from "@/lib/pagination/blocks";
import { PaginatedPages } from "./PaginatedPages";

// Shared verbatim by the editor preview (chrome="screen") and the /print
// route (chrome="print"): same components, same CSS, same deterministic
// paginator — which is what makes preview == PDF structural.
export function ResumeDocument({
  resume,
  chrome,
  onSideWidthChange,
}: {
  resume: Resume;
  chrome: "screen" | "print";
  onSideWidthChange?: (percent: number) => void;
}) {
  const tokens = useMemo(() => resolveTokens(resume), [resume]);
  const flows = useMemo(() => buildFlows(resume, tokens), [resume, tokens]);

  return (
    <div
      className="resume-root"
      data-resume-id={resume.id}
      style={tokensToCssVars(tokens)}
    >
      <PaginatedPages
        flows={flows}
        layout={resume.layout}
        tokens={tokens}
        chrome={chrome}
        onSideWidthChange={onSideWidthChange}
      />
    </div>
  );
}
