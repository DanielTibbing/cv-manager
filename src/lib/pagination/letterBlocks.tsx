// Letter → atomic block flows for the shared paginator. Mirrors blocks.tsx:
// spacing lives here as data so gaps drop at page tops; every paragraph is
// one atomic block that never splits across pages.

import type { Letter, Profile, ThemeTokens } from "@/lib/schema";
import { ProfileHeader } from "@/components/resume/blocks/ProfileHeader";
import { CompactHeader } from "@/components/resume/blocks/CompactHeader";
import {
  PlaceholderText,
  placeholderValues,
} from "@/lib/letters/placeholders";
import type { BlockDef, Flows } from "./blocks";

function splitParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((p) => p.replace(/^\n+|\n+$/g, ""))
    .filter((p) => p.trim().length > 0);
}

export function buildLetterFlows(
  letter: Letter,
  profile: Profile,
  tokens: ThemeTokens
): Flows {
  const values = placeholderValues(letter);
  const main: BlockDef[] = [];

  if (letter.date) {
    main.push({
      id: "__date",
      sectionId: null,
      gapBeforeMm: 0,
      keepWithNext: true,
      vars: {},
      node: (
        <div className="lt-date">
          <PlaceholderText text={letter.date} values={values} />
        </div>
      ),
    });
  }

  if (letter.recipient) {
    main.push({
      id: "__recipient",
      sectionId: null,
      gapBeforeMm: letter.date ? 2 : 0,
      keepWithNext: true,
      vars: {},
      node: (
        <div className="lt-recipient">
          <PlaceholderText text={letter.recipient} values={values} />
        </div>
      ),
    });
  }

  main.push({
    id: "__heading",
    sectionId: null,
    gapBeforeMm: main.length ? tokens.sectionGapMm : 0,
    keepWithNext: true,
    vars: {},
    node: (
      <h2
        className={`rs-section-title rs-section-title--${tokens.sectionTitleStyle}`}
      >
        <PlaceholderText text={letter.heading} values={values} />
      </h2>
    ),
  });

  splitParagraphs(letter.body).forEach((paragraph, i) => {
    main.push({
      id: `__p${i}`,
      sectionId: null,
      gapBeforeMm: i === 0 ? 0 : tokens.itemGapMm,
      keepWithNext: false,
      vars: {},
      node: (
        <p className="lt-paragraph">
          <PlaceholderText text={paragraph} values={values} />
        </p>
      ),
    });
  });

  return {
    banner: {
      id: "__header",
      sectionId: null,
      gapBeforeMm: 0,
      keepWithNext: false,
      vars: {},
      node:
        letter.headerStyle === "compact" ? (
          <CompactHeader profile={profile} />
        ) : (
          <ProfileHeader profile={profile} />
        ),
    },
    main,
    side: [],
  };
}
