import { z } from "zod";

// ---------- theme tokens ----------

export const ThemeTokensSchema = z.object({
  fontFamilyHeading: z.string(),
  fontFamilyBody: z.string(),
  fontSizeBasePt: z.number(),
  fontSizeNamePt: z.number(),
  fontSizeSectionTitlePt: z.number(),
  fontSizeItemTitlePt: z.number(),
  fontSizeMetaPt: z.number(),
  lineHeightBody: z.number(),
  lineHeightHeading: z.number(),
  colorText: z.string(),
  colorHeading: z.string(),
  colorAccent: z.string(),
  colorMuted: z.string(),
  colorRule: z.string(),
  colorSidebarBg: z.string(),
  pageMarginMm: z.object({
    top: z.number(),
    right: z.number(),
    bottom: z.number(),
    left: z.number(),
  }),
  sectionGapMm: z.number(),
  itemGapMm: z.number(),
  bulletGapMm: z.number(),
  sectionTitleStyle: z.enum(["underline", "caps", "accent-bar", "plain"]),
  columnGapMm: z.number(),
});
export type ThemeTokens = z.infer<typeof ThemeTokensSchema>;

export const TemplateIdSchema = z.enum([
  "modern",
  "classic",
  "minimalist",
  "two-column",
]);
export type TemplateId = z.infer<typeof TemplateIdSchema>;

// ---------- per-section spacing overrides ----------

export const SectionStyleOverridesSchema = z.object({
  marginTopMm: z.number().optional(),
  marginBottomMm: z.number().optional(),
  paddingXMm: z.number().optional(),
  paddingYMm: z.number().optional(),
  itemGapMm: z.number().optional(),
  fontSizePt: z.number().optional(),
  headingFontSizePt: z.number().optional(),
  lineHeight: z.number().optional(),
});
export type SectionStyleOverrides = z.infer<typeof SectionStyleOverridesSchema>;

// ---------- profile ----------

export const ContactSchema = z.object({
  id: z.string(),
  kind: z.enum([
    "email",
    "phone",
    "location",
    "website",
    "linkedin",
    "github",
    "custom",
  ]),
  label: z.string().optional(),
  value: z.string(),
});
export type Contact = z.infer<typeof ContactSchema>;

export const ProfileSchema = z.object({
  fullName: z.string(),
  headline: z.string(),
  summary: z.string().optional(),
  photo: z
    .object({
      file: z.string(), // filename inside data/uploads/
      shape: z.enum(["circle", "rounded", "square"]),
      sizeMm: z.number(),
    })
    .optional(),
  contacts: z.array(ContactSchema),
});
export type Profile = z.infer<typeof ProfileSchema>;

// ---------- sections (discriminated union) ----------

const sectionBase = {
  id: z.string(),
  title: z.string(),
  visible: z.boolean(),
  style: SectionStyleOverridesSchema.optional(),
};

// A client engagement nested under an employer entry — e.g. consultant
// positions held while employed by a consultancy, with their own role
// names and periods.
export const SubPositionSchema = z.object({
  id: z.string(),
  role: z.string(),
  client: z.string(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  visible: z.boolean(),
});
export type SubPosition = z.infer<typeof SubPositionSchema>;

export const ExperienceItemSchema = z.object({
  id: z.string(),
  role: z.string(),
  company: z.string(),
  location: z.string().optional(),
  startDate: z.string().optional(), // "2023-04" or free-form
  endDate: z.string().optional(),
  current: z.boolean().optional(),
  summary: z.string().optional(),
  bullets: z.array(z.string()),
  subPositions: z.array(SubPositionSchema).optional(),
  subPositionsLabel: z.string().optional(), // default "Consultant positions"
  visible: z.boolean(),
});
export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;

export const EducationItemSchema = z.object({
  id: z.string(),
  degree: z.string(),
  institution: z.string(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  details: z.string().optional(),
  visible: z.boolean(),
});
export type EducationItem = z.infer<typeof EducationItemSchema>;

export const SkillGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  skills: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      level: z.number().int().min(1).max(5).optional(),
    })
  ),
});
export type SkillGroup = z.infer<typeof SkillGroupSchema>;

export const ProjectItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().optional(),
  description: z.string().optional(),
  bullets: z.array(z.string()),
  tech: z.array(z.string()),
  visible: z.boolean(),
});
export type ProjectItem = z.infer<typeof ProjectItemSchema>;

export const CustomItemSchema = z.object({
  id: z.string(),
  heading: z.string().optional(),
  sub: z.string().optional(),
  // plain text; newlines render as line breaks, "- " lines as bullets
  body: z.string(),
  visible: z.boolean(),
});
export type CustomItem = z.infer<typeof CustomItemSchema>;

export const SectionSchema = z.discriminatedUnion("kind", [
  z.object({
    ...sectionBase,
    kind: z.literal("experience"),
    items: z.array(ExperienceItemSchema),
  }),
  z.object({
    ...sectionBase,
    kind: z.literal("education"),
    items: z.array(EducationItemSchema),
  }),
  z.object({
    ...sectionBase,
    kind: z.literal("skills"),
    display: z.enum(["groups", "tags", "bars"]),
    groups: z.array(SkillGroupSchema),
  }),
  z.object({
    ...sectionBase,
    kind: z.literal("projects"),
    items: z.array(ProjectItemSchema),
  }),
  z.object({
    ...sectionBase,
    kind: z.literal("custom"),
    items: z.array(CustomItemSchema),
  }),
]);
export type Section = z.infer<typeof SectionSchema>;
export type SectionKind = Section["kind"];

// ---------- layout ----------

export const LayoutSchema = z.object({
  mode: z.enum(["single", "two-column"]),
  // section ids in visual order; single mode keeps side = []
  columns: z.object({
    main: z.array(z.string()),
    side: z.array(z.string()),
  }),
  sideColumnWidthPercent: z.number().min(20).max(50),
  sidePosition: z.enum(["left", "right"]),
  headerPlacement: z.enum(["banner", "in-main"]),
});
export type Layout = z.infer<typeof LayoutSchema>;

// ---------- resume ----------

export const ResumeSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  name: z.string(),
  templateId: TemplateIdSchema,
  profile: ProfileSchema,
  sections: z.array(SectionSchema),
  layout: LayoutSchema,
  themeOverrides: ThemeTokensSchema.partial(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Resume = z.infer<typeof ResumeSchema>;

// ---------- personal letters (cover letters) ----------

export const LetterStatusSchema = z.enum([
  "draft",
  "sent",
  "interview",
  "offer",
  "rejected",
]);
export type LetterStatus = z.infer<typeof LetterStatusSchema>;

export const LetterJobSchema = z.object({
  // Pasted job-description text, shown in the editor's reference panel.
  description: z.string(),
  url: z.string().optional(),
});

// Captured only when the linked resume is deleted, so the letter keeps
// rendering with the same styling and identity.
export const LetterSnapshotSchema = z.object({
  templateId: TemplateIdSchema,
  themeOverrides: ThemeTokensSchema.partial(),
  profile: ProfileSchema,
});
export type LetterSnapshot = z.infer<typeof LetterSnapshotSchema>;

export const LetterSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  name: z.string(), // internal label, e.g. "Apollo — Engineering Manager"
  resumeId: z.string().nullable(), // styling + profile source
  snapshot: LetterSnapshotSchema.optional(),
  isBase: z.boolean(), // base/template letter for "new from base"
  company: z.string(), // fills {{company}}
  role: z.string(), // fills {{role}}
  status: LetterStatusSchema.default("draft"),
  headerStyle: z.enum(["banner", "compact", "compact-photo"]).default("banner"),
  date: z.string().optional(), // free-form display date; unset = not rendered
  recipient: z.string().optional(), // multi-line block; unset = not rendered
  heading: z.string(), // e.g. "Application for {{role}} at {{company}}"
  body: z.string(), // plain text; blank line = new paragraph
  job: LetterJobSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Letter = z.infer<typeof LetterSchema>;

export const LetterIndexEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  company: z.string(),
  role: z.string(),
  status: LetterStatusSchema,
  resumeId: z.string().nullable(),
  isBase: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type LetterIndexEntry = z.infer<typeof LetterIndexEntrySchema>;

// ---------- multi-resume index ----------

export const ResumeIndexEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  templateId: TemplateIdSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ResumeIndexEntry = z.infer<typeof ResumeIndexEntrySchema>;

export const ResumeIndexSchema = z.object({
  version: z.literal(1),
  activeResumeId: z.string().nullable(),
  resumes: z.array(ResumeIndexEntrySchema),
  // Additive with a default: existing index.json files parse unchanged.
  letters: z.array(LetterIndexEntrySchema).default([]),
});
export type ResumeIndex = z.infer<typeof ResumeIndexSchema>;
