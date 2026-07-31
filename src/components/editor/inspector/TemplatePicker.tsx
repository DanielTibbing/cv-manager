"use client";

import { templates } from "@/lib/templates";
import type { TemplateId } from "@/lib/schema";
import { useResumeStore } from "@/store/resumeStore";

// Abstract A4 wireframes so the picker shows *how* each template differs
// (accent bars, rules, whitespace, sidebar) instead of just naming it.
const LINE = "#cbd5e1";
const NAME = "#475569";
const ACCENT = "#3b82f6";
const TINT = "#dbeafe";

function TemplateThumb({ id }: { id: TemplateId }) {
  return (
    <svg
      viewBox="0 0 60 80"
      aria-hidden
      className="h-auto w-full rounded-sm bg-white ring-1 ring-slate-200"
    >
      {id === "modern" && (
        <>
          <rect x="6" y="8" width="26" height="4" rx="1" fill={NAME} />
          <rect x="6" y="14.5" width="18" height="2" rx="1" fill={LINE} />
          {[26, 46].map((y) => (
            <g key={y}>
              <rect x="6" y={y} width="2.5" height="3.5" fill={ACCENT} />
              <rect x="10.5" y={y + 0.5} width="15" height="2.5" rx="1" fill={NAME} opacity="0.7" />
              <rect x="6" y={y + 6} width="48" height="1.8" rx="0.9" fill={LINE} />
              <rect x="6" y={y + 10} width="44" height="1.8" rx="0.9" fill={LINE} />
              <rect x="6" y={y + 14} width="46" height="1.8" rx="0.9" fill={LINE} />
            </g>
          ))}
        </>
      )}
      {id === "classic" && (
        <>
          <rect x="19" y="8" width="22" height="4" rx="1" fill={NAME} />
          <rect x="23" y="14.5" width="14" height="2" rx="1" fill={LINE} />
          <rect x="6" y="20" width="48" height="0.8" fill={NAME} opacity="0.6" />
          {[26, 46].map((y) => (
            <g key={y}>
              <rect x="6" y={y} width="16" height="2.5" rx="1" fill={NAME} opacity="0.7" />
              <rect x="6" y={y + 4} width="48" height="0.6" fill={LINE} />
              <rect x="6" y={y + 7} width="48" height="1.8" rx="0.9" fill={LINE} />
              <rect x="6" y={y + 11} width="42" height="1.8" rx="0.9" fill={LINE} />
            </g>
          ))}
        </>
      )}
      {id === "minimalist" && (
        <>
          <rect x="6" y="10" width="16" height="3" rx="1" fill={NAME} />
          {[28, 52].map((y) => (
            <g key={y}>
              <rect x="6" y={y} width="12" height="2" rx="1" fill={NAME} opacity="0.6" />
              <rect x="6" y={y + 6} width="40" height="1.5" rx="0.75" fill={LINE} />
              <rect x="6" y={y + 10} width="34" height="1.5" rx="0.75" fill={LINE} />
            </g>
          ))}
        </>
      )}
      {id === "two-column" && (
        <>
          <rect x="6" y="8" width="24" height="4" rx="1" fill={NAME} />
          <rect x="6" y="14.5" width="16" height="2" rx="1" fill={LINE} />
          <rect x="6" y="22" width="16" height="52" rx="1" fill={TINT} />
          <rect x="9" y="27" width="10" height="2" rx="1" fill={NAME} opacity="0.6" />
          <rect x="9" y="32" width="9" height="1.5" rx="0.75" fill={LINE} />
          <rect x="9" y="36" width="8" height="1.5" rx="0.75" fill={LINE} />
          <rect x="9" y="44" width="10" height="2" rx="1" fill={NAME} opacity="0.6" />
          <rect x="9" y="49" width="9" height="1.5" rx="0.75" fill={LINE} />
          {[26, 46].map((y) => (
            <g key={y}>
              <rect x="26" y={y} width="2.5" height="3.5" fill={ACCENT} />
              <rect x="30.5" y={y + 0.5} width="14" height="2.5" rx="1" fill={NAME} opacity="0.7" />
              <rect x="26" y={y + 6} width="28" height="1.8" rx="0.9" fill={LINE} />
              <rect x="26" y={y + 10} width="24" height="1.8" rx="0.9" fill={LINE} />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}

export function TemplatePicker() {
  const templateId = useResumeStore((s) => s.resume?.templateId);
  const hasOverrides = useResumeStore(
    (s) => Object.keys(s.resume?.themeOverrides ?? {}).length > 0
  );
  const switchTemplate = useResumeStore((s) => s.switchTemplate);
  if (!templateId) return null;

  const pick = (id: TemplateId) => {
    if (id === templateId) return;
    if (
      hasOverrides &&
      !window.confirm(
        "Switching templates keeps all content but resets your theme tweaks (fonts, colors, spacing overrides). Continue?"
      )
    ) {
      return;
    }
    switchTemplate(id);
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
        Template
      </span>
      <div className="grid grid-cols-2 gap-2">
        {Object.values(templates).map((template) => (
          <button
            key={template.id}
            type="button"
            title={template.description}
            aria-pressed={template.id === templateId}
            onClick={() => pick(template.id)}
            className={`flex flex-col gap-1.5 rounded border p-2 text-left text-xs ${
              template.id === templateId
                ? "border-blue-500 bg-blue-50 font-semibold text-blue-700"
                : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <TemplateThumb id={template.id} />
            {template.name}
          </button>
        ))}
      </div>
    </div>
  );
}
