"use client";

// Global theme overrides on top of the template tokens (resume.themeOverrides).
// Every control shows the effective value; number fields cascade back to the
// template when cleared, and one button resets everything.

import type { ReactNode } from "react";
import type { ThemeTokens } from "@/lib/schema";
import { getTemplate } from "@/lib/templates";
import { useResumeStore } from "@/store/resumeStore";
import { OverrideNumber } from "./OverrideField";

// Self-hosted webfonts render identically on any machine; the "system"
// entries use fonts installed on this Mac — fine for a local tool, since the
// preview and Puppeteer share the same installed font files, but a resume
// using them won't render the same elsewhere.
const FONT_OPTIONS = [
  { value: "var(--font-inter)", label: "Inter (sans)" },
  { value: "var(--font-source-serif)", label: "Source Serif (serif)" },
  { value: "var(--font-nunito-sans)", label: "Nunito Sans (Avenir-like)" },
  { value: "var(--font-arimo)", label: "Arimo (Helvetica-like)" },
  {
    value: '"Avenir Next", Avenir, var(--font-nunito-sans), sans-serif',
    label: "Avenir (system)",
  },
  {
    value: '"Helvetica Neue", Helvetica, var(--font-arimo), sans-serif',
    label: "Helvetica (system)",
  },
];

const TITLE_STYLES: { value: ThemeTokens["sectionTitleStyle"]; label: string }[] = [
  { value: "accent-bar", label: "Accent bar" },
  { value: "underline", label: "Underline" },
  { value: "caps", label: "Caps" },
  { value: "plain", label: "Plain" },
];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-1 mt-2 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </span>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function ThemeInspector() {
  const resume = useResumeStore((s) => s.resume);
  const update = useResumeStore((s) => s.update);
  if (!resume) return null;

  const base = getTemplate(resume.templateId).tokens;
  const overrides = resume.themeOverrides;
  const effective: ThemeTokens = { ...base, ...overrides };
  const overrideCount = Object.keys(overrides).length;

  const setToken = <K extends keyof ThemeTokens>(
    key: K,
    value: ThemeTokens[K] | undefined
  ) =>
    update((draft) => {
      if (value === undefined) delete draft.themeOverrides[key];
      else draft.themeOverrides[key] = value;
    });

  const num = <K extends keyof ThemeTokens>(key: K) => ({
    value: overrides[key] as number | undefined,
    fallback: base[key] as number,
    onChange: (v: number | undefined) =>
      setToken(key, v as ThemeTokens[K] | undefined),
  });

  const colorInput = (key: keyof ThemeTokens, label: string) => (
    <Row label={label}>
      <span className="flex items-center gap-1">
        <input
          type="color"
          value={effective[key] as string}
          onChange={(e) => setToken(key, e.target.value)}
          className="h-6 w-10 cursor-pointer rounded border border-slate-300"
        />
        <button
          type="button"
          title="Reset to template default"
          disabled={overrides[key] === undefined}
          onClick={() => setToken(key, undefined)}
          className="rounded px-1 text-xs text-slate-400 hover:bg-slate-100 disabled:invisible"
        >
          ↺
        </button>
      </span>
    </Row>
  );

  const selectCls =
    "rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-700 focus:border-blue-400 focus:outline-none";

  const setMargin = (side: keyof ThemeTokens["pageMarginMm"], v: number | undefined) => {
    const next = { ...effective.pageMarginMm, [side]: v ?? base.pageMarginMm[side] };
    setToken("pageMarginMm", next);
  };

  return (
    <div className="flex flex-col gap-1">
      <Group title="Typography">
        <Row label="Body font">
          <select
            className={selectCls}
            value={effective.fontFamilyBody}
            onChange={(e) => setToken("fontFamilyBody", e.target.value)}
          >
            {FONT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Heading font">
          <select
            className={selectCls}
            value={effective.fontFamilyHeading}
            onChange={(e) => setToken("fontFamilyHeading", e.target.value)}
          >
            {FONT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Section title style">
          <select
            className={selectCls}
            value={effective.sectionTitleStyle}
            onChange={(e) =>
              setToken(
                "sectionTitleStyle",
                e.target.value as ThemeTokens["sectionTitleStyle"]
              )
            }
          >
            {TITLE_STYLES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Row>
        <OverrideNumber label="Base size" unit="pt" min={6} max={16} {...num("fontSizeBasePt")} />
        <OverrideNumber label="Name size" unit="pt" min={14} max={40} {...num("fontSizeNamePt")} />
        <OverrideNumber label="Section titles" unit="pt" min={7} max={20} {...num("fontSizeSectionTitlePt")} />
        <OverrideNumber label="Item titles" unit="pt" min={7} max={18} {...num("fontSizeItemTitlePt")} />
        <OverrideNumber label="Meta text" unit="pt" min={6} max={14} {...num("fontSizeMetaPt")} />
        <OverrideNumber label="Line height (body)" step={0.05} min={1} max={2.5} {...num("lineHeightBody")} />
        <OverrideNumber label="Line height (headings)" step={0.05} min={1} max={2} {...num("lineHeightHeading")} />
      </Group>

      <Group title="Colors">
        {colorInput("colorAccent", "Accent")}
        {colorInput("colorText", "Body text")}
        {colorInput("colorHeading", "Headings")}
        {colorInput("colorMuted", "Muted text")}
        {colorInput("colorRule", "Rules & borders")}
        {colorInput("colorSidebarBg", "Sidebar background")}
      </Group>

      <Group title="Page margins">
        <OverrideNumber
          label="Top" unit="mm" min={4} max={40}
          value={overrides.pageMarginMm?.top}
          fallback={base.pageMarginMm.top}
          onChange={(v) => setMargin("top", v)}
        />
        <OverrideNumber
          label="Right" unit="mm" min={4} max={40}
          value={overrides.pageMarginMm?.right}
          fallback={base.pageMarginMm.right}
          onChange={(v) => setMargin("right", v)}
        />
        <OverrideNumber
          label="Bottom" unit="mm" min={4} max={40}
          value={overrides.pageMarginMm?.bottom}
          fallback={base.pageMarginMm.bottom}
          onChange={(v) => setMargin("bottom", v)}
        />
        <OverrideNumber
          label="Left" unit="mm" min={4} max={40}
          value={overrides.pageMarginMm?.left}
          fallback={base.pageMarginMm.left}
          onChange={(v) => setMargin("left", v)}
        />
      </Group>

      <Group title="Spacing">
        <OverrideNumber label="Between sections" unit="mm" {...num("sectionGapMm")} />
        <OverrideNumber label="Between items" unit="mm" {...num("itemGapMm")} />
        <OverrideNumber label="Between bullets" unit="mm" step={0.2} {...num("bulletGapMm")} />
        <OverrideNumber label="Column gap" unit="mm" {...num("columnGapMm")} />
      </Group>

      {overrideCount > 0 && (
        <button
          type="button"
          onClick={() => update((d) => void (d.themeOverrides = {}))}
          className="mt-2 rounded border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
        >
          Reset all {overrideCount} theme override{overrideCount > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
