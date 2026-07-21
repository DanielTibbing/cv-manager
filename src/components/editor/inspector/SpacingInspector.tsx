"use client";

// Per-section spacing & type overrides (SectionStyleOverrides). Unset fields
// cascade to the template token — shown as the input placeholder. The
// paginator consumes margins/padding/item gap as gap arithmetic; font size
// and line-height flow through --sec-* custom properties.

import { useMemo } from "react";
import type { Section, SectionStyleOverrides } from "@/lib/schema";
import { resolveTokens } from "@/lib/templates";
import { useResumeStore } from "@/store/resumeStore";
import { OverrideNumber } from "./OverrideField";

export function SpacingInspector({ section }: { section: Section }) {
  const update = useResumeStore((s) => s.update);
  // Select the stable resume reference and derive tokens outside the
  // selector — resolveTokens returns a fresh object, which inside a zustand
  // selector would fail equality every check and loop the render.
  const resume = useResumeStore((s) => s.resume);
  const tokens = useMemo(
    () => (resume ? resolveTokens(resume) : null),
    [resume]
  );
  if (!tokens) return null;

  const style = section.style ?? {};
  const setStyle = <K extends keyof SectionStyleOverrides>(
    key: K,
    value: SectionStyleOverrides[K] | undefined
  ) =>
    update((draft) => {
      const target = draft.sections.find((s) => s.id === section.id);
      if (!target) return;
      const next = { ...target.style, [key]: value };
      if (value === undefined) delete next[key];
      target.style = Object.keys(next).length ? next : undefined;
    });

  return (
    <details className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
      <summary className="cursor-pointer text-xs font-semibold text-slate-500">
        Spacing & type
        {section.style && Object.keys(section.style).length > 0 && (
          <span className="ml-1 rounded bg-blue-100 px-1 text-[10px] text-blue-700">
            {Object.keys(section.style).length} override
            {Object.keys(section.style).length > 1 ? "s" : ""}
          </span>
        )}
      </summary>
      <div className="mt-2 flex flex-col gap-1.5">
        <OverrideNumber
          label="Space above"
          unit="mm"
          value={style.marginTopMm}
          fallback={tokens.sectionGapMm}
          onChange={(v) => setStyle("marginTopMm", v)}
        />
        <OverrideNumber
          label="Space below"
          unit="mm"
          value={style.marginBottomMm}
          fallback={0}
          onChange={(v) => setStyle("marginBottomMm", v)}
        />
        <OverrideNumber
          label="Horizontal padding"
          unit="mm"
          value={style.paddingXMm}
          fallback={0}
          onChange={(v) => setStyle("paddingXMm", v)}
        />
        <OverrideNumber
          label="Vertical padding"
          unit="mm"
          value={style.paddingYMm}
          fallback={0}
          onChange={(v) => setStyle("paddingYMm", v)}
        />
        <OverrideNumber
          label="Gap between items"
          unit="mm"
          value={style.itemGapMm}
          fallback={tokens.itemGapMm}
          onChange={(v) => setStyle("itemGapMm", v)}
        />
        <OverrideNumber
          label="Body font size"
          unit="pt"
          min={6}
          max={16}
          value={style.fontSizePt}
          fallback={tokens.fontSizeBasePt}
          onChange={(v) => setStyle("fontSizePt", v)}
        />
        <OverrideNumber
          label="Title font size"
          unit="pt"
          min={7}
          max={20}
          value={style.headingFontSizePt}
          fallback={tokens.fontSizeSectionTitlePt}
          onChange={(v) => setStyle("headingFontSizePt", v)}
        />
        <OverrideNumber
          label="Line height"
          step={0.05}
          min={1}
          max={2.5}
          value={style.lineHeight}
          fallback={tokens.lineHeightBody}
          onChange={(v) => setStyle("lineHeight", v)}
        />
      </div>
    </details>
  );
}
