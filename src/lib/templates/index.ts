import type { CSSProperties } from "react";
import type {
  Letter,
  Profile,
  Resume,
  TemplateId,
  ThemeTokens,
} from "@/lib/schema";
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

// A letter borrows its entire visual identity from its linked resume; if that
// resume was deleted, from the snapshot frozen at deletion time; else from
// the Modern template with an empty identity.
export function resolveLetterStyle(
  letter: Letter,
  resume: Resume | null
): { tokens: ThemeTokens; profile: Profile } {
  if (resume) {
    return { tokens: resolveTokens(resume), profile: resume.profile };
  }
  if (letter.snapshot) {
    return {
      tokens: {
        ...getTemplate(letter.snapshot.templateId).tokens,
        ...letter.snapshot.themeOverrides,
      },
      profile: letter.snapshot.profile,
    };
  }
  return {
    tokens: templates.modern.tokens,
    profile: { fullName: "", headline: "", contacts: [] },
  };
}

// The --rs-* custom properties consumed by resume.css — shared by
// ResumeDocument and LetterDocument so "same styling" is literally the same
// function.
export function tokensToCssVars(t: ThemeTokens): CSSProperties {
  return {
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
