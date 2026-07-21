import type { Resume, TemplateId, ThemeTokens } from "@/lib/schema";
import type { Template } from "./types";
import { modern } from "./modern";
import { classic } from "./classic";
import { minimalist } from "./minimalist";
import { twoColumn } from "./two-column";

export type { Template };

export const templates: Record<TemplateId, Template> = {
  modern,
  classic,
  minimalist,
  "two-column": twoColumn,
};

export function getTemplate(id: TemplateId): Template {
  return templates[id];
}

// Effective style cascade: template.tokens ⊕ resume.themeOverrides.
// (Per-section overrides are applied as inline custom properties at render time.)
export function resolveTokens(resume: Resume): ThemeTokens {
  return { ...getTemplate(resume.templateId).tokens, ...resume.themeOverrides };
}

// Non-destructive template switch: content is untouched; the same section ids
// are re-slotted into columns per the template's defaultLayout, and
// themeOverrides are reset (caller confirms with the user first).
export function applyTemplate(resume: Resume, templateId: TemplateId): Resume {
  const template = getTemplate(templateId);
  const orderedIds = [...resume.layout.columns.main, ...resume.layout.columns.side];
  const byId = new Map(resume.sections.map((s) => [s.id, s]));

  const side: string[] = [];
  const main: string[] = [];
  for (const id of orderedIds) {
    const section = byId.get(id);
    if (!section) continue;
    if (
      template.defaultLayout.mode === "two-column" &&
      template.sideKinds.includes(section.kind)
    ) {
      side.push(id);
    } else {
      main.push(id);
    }
  }

  return {
    ...resume,
    templateId,
    themeOverrides: {},
    layout: {
      ...resume.layout,
      ...template.defaultLayout,
      columns: { main, side },
    },
  };
}
