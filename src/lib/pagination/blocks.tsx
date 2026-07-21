// Turns a resume into flat lists of atomic blocks per column flow, each with
// the vertical gap that precedes it and keep-with-next glue. Spacing that was
// expressed as CSS margins in a continuous flow lives HERE as data, so the
// paginator can drop gaps at page tops and never orphan a section title.

import type { CSSProperties, ReactNode } from "react";
import type { Resume, Section, ThemeTokens } from "@/lib/schema";
import { mm, pt } from "@/lib/units";
import { ProfileHeader } from "@/components/resume/blocks/ProfileHeader";
import { ExperienceItemBlock } from "@/components/resume/blocks/ExperienceItems";
import { EducationItemBlock } from "@/components/resume/blocks/EducationItems";
import { SkillGroupBlock, SkillTagsBlock } from "@/components/resume/blocks/SkillsBlock";
import { ProjectItemBlock } from "@/components/resume/blocks/ProjectItems";
import { CustomItemBlock } from "@/components/resume/blocks/CustomItems";

export interface BlockDef {
  id: string;
  sectionId: string | null;
  gapBeforeMm: number;
  keepWithNext: boolean;
  // Per-section overrides as custom properties consumed by .pg-block /
  // .rs-section-title. Spacing overrides (margins/padding-y/item gap) are
  // NOT here — they feed the gap arithmetic instead.
  vars: CSSProperties;
  node: ReactNode;
}

export interface Flows {
  banner: BlockDef | null;
  main: BlockDef[];
  side: BlockDef[];
}

function sectionVars(section: Section): CSSProperties {
  const s = section.style;
  return {
    "--sec-fs": pt(s?.fontSizePt),
    "--sec-title-fs": pt(s?.headingFontSizePt),
    "--sec-lh": s?.lineHeight,
    "--sec-px": mm(s?.paddingXMm),
  } as CSSProperties;
}

// Items of one section as {id, node, gapScale} — gapScale shrinks the gap
// for dense lists (skill groups).
function itemEntries(
  section: Section
): { id: string; node: ReactNode; gapScale?: number }[] {
  switch (section.kind) {
    case "experience":
      return section.items
        .filter((i) => i.visible)
        .map((i) => ({ id: i.id, node: <ExperienceItemBlock item={i} /> }));
    case "education":
      return section.items
        .filter((i) => i.visible)
        .map((i) => ({ id: i.id, node: <EducationItemBlock item={i} /> }));
    case "projects":
      return section.items
        .filter((i) => i.visible)
        .map((i) => ({ id: i.id, node: <ProjectItemBlock item={i} /> }));
    case "custom":
      return section.items
        .filter((i) => i.visible)
        .map((i) => ({ id: i.id, node: <CustomItemBlock item={i} /> }));
    case "skills":
      if (section.display === "tags") {
        return [
          { id: "tags", node: <SkillTagsBlock groups={section.groups} /> },
        ];
      }
      return section.groups.map((g) => ({
        id: g.id,
        node: (
          <SkillGroupBlock
            group={g}
            display={section.display === "bars" ? "bars" : "groups"}
          />
        ),
        gapScale: 0.6,
      }));
  }
}

function sectionBlocks(
  section: Section,
  tokens: ThemeTokens,
  prev: Section | null,
  isFirstInFlow: boolean
): BlockDef[] {
  const style = section.style;
  // paddingY folds into the space before/after the section — with discrete
  // pages there is no box for it to pad, but the spacing intent is kept.
  const marginTop = (style?.marginTopMm ?? tokens.sectionGapMm) + (style?.paddingYMm ?? 0);
  const prevBottom = prev
    ? (prev.style?.marginBottomMm ?? 0) + (prev.style?.paddingYMm ?? 0)
    : 0;
  const itemGap = style?.itemGapMm ?? tokens.itemGapMm;
  const vars = sectionVars(section);
  const items = itemEntries(section);

  const blocks: BlockDef[] = [
    {
      id: `${section.id}:title`,
      sectionId: section.id,
      gapBeforeMm: isFirstInFlow ? 0 : marginTop + prevBottom,
      keepWithNext: items.length > 0,
      vars,
      node: (
        <h2
          className={`rs-section-title rs-section-title--${tokens.sectionTitleStyle}`}
        >
          {section.title}
        </h2>
      ),
    },
  ];

  items.forEach((item, idx) => {
    blocks.push({
      id: `${section.id}:${item.id}`,
      sectionId: section.id,
      // First item sits flush under the title (the title's own 2mm bottom
      // margin is contained inside its block height).
      gapBeforeMm: idx === 0 ? 0 : itemGap * (item.gapScale ?? 1),
      keepWithNext: false,
      vars,
      node: item.node,
    });
  });

  return blocks;
}

export function buildFlows(resume: Resume, tokens: ThemeTokens): Flows {
  const byId = new Map(resume.sections.map((s) => [s.id, s]));
  const visibleSections = (ids: string[]) =>
    ids
      .map((id) => byId.get(id))
      .filter((s): s is Section => !!s && s.visible);

  const flowFor = (ids: string[], leadingBlocks: BlockDef[]): BlockDef[] => {
    const out = [...leadingBlocks];
    let prev: Section | null = null;
    visibleSections(ids).forEach((section, i) => {
      const isFirst = i === 0 && leadingBlocks.length === 0;
      out.push(...sectionBlocks(section, tokens, prev, isFirst));
      prev = section;
    });
    return out;
  };

  const headerBlock: BlockDef = {
    id: "__header",
    sectionId: null,
    gapBeforeMm: 0,
    keepWithNext: false,
    vars: {},
    node: <ProfileHeader profile={resume.profile} />,
  };

  const inMain = resume.layout.headerPlacement === "in-main";
  return {
    banner: inMain ? null : headerBlock,
    main: flowFor(resume.layout.columns.main, inMain ? [headerBlock] : []),
    side:
      resume.layout.mode === "two-column"
        ? flowFor(resume.layout.columns.side, [])
        : [],
  };
}
