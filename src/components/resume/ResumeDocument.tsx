"use client";

import type { CSSProperties } from "react";
import type { Resume } from "@/lib/schema";
import { resolveTokens } from "@/lib/templates";
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
  const t = resolveTokens(resume);

  const rootVars = {
    "--rs-font-heading": t.fontFamilyHeading,
    "--rs-font-body": t.fontFamilyBody,
    "--rs-fs-base": `${t.fontSizeBasePt}pt`,
    "--rs-fs-name": `${t.fontSizeNamePt}pt`,
    "--rs-fs-section-title": `${t.fontSizeSectionTitlePt}pt`,
    "--rs-fs-item-title": `${t.fontSizeItemTitlePt}pt`,
    "--rs-fs-meta": `${t.fontSizeMetaPt}pt`,
    "--rs-lh-body": t.lineHeightBody,
    "--rs-lh-heading": t.lineHeightHeading,
    "--rs-c-text": t.colorText,
    "--rs-c-heading": t.colorHeading,
    "--rs-c-accent": t.colorAccent,
    "--rs-c-muted": t.colorMuted,
    "--rs-c-rule": t.colorRule,
    "--rs-c-sidebar-bg": t.colorSidebarBg,
    "--rs-pm-top": `${t.pageMarginMm.top}mm`,
    "--rs-pm-right": `${t.pageMarginMm.right}mm`,
    "--rs-pm-bottom": `${t.pageMarginMm.bottom}mm`,
    "--rs-pm-left": `${t.pageMarginMm.left}mm`,
    "--rs-bullet-gap": `${t.bulletGapMm}mm`,
  } as CSSProperties;

  return (
    <div className="resume-root" data-resume-id={resume.id} style={rootVars}>
      <PaginatedPages
        resume={resume}
        tokens={t}
        chrome={chrome}
        onSideWidthChange={onSideWidthChange}
      />
    </div>
  );
}
