"use client";

import { templates } from "@/lib/templates";
import type { TemplateId } from "@/lib/schema";
import { useResumeStore } from "@/store/resumeStore";

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
      <div className="grid grid-cols-2 gap-1.5">
        {Object.values(templates).map((template) => (
          <button
            key={template.id}
            type="button"
            title={template.description}
            onClick={() => pick(template.id)}
            className={`rounded border px-2 py-1.5 text-left text-xs ${
              template.id === templateId
                ? "border-blue-500 bg-blue-50 font-semibold text-blue-700"
                : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {template.name}
          </button>
        ))}
      </div>
    </div>
  );
}
