import { nanoid } from "nanoid";
import type {
  CustomItem,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  Resume,
  Section,
  SectionKind,
  SkillGroup,
  TemplateId,
} from "@/lib/schema";
import { getTemplate } from "@/lib/templates";

export function newExperienceItem(): ExperienceItem {
  return { id: nanoid(8), role: "", company: "", bullets: [], visible: true };
}

export function newSubPosition() {
  return { id: nanoid(8), role: "", client: "", visible: true };
}

export function newEducationItem(): EducationItem {
  return { id: nanoid(8), degree: "", institution: "", visible: true };
}

export function newProjectItem(): ProjectItem {
  return { id: nanoid(8), name: "", bullets: [], tech: [], visible: true };
}

export function newCustomItem(): CustomItem {
  return { id: nanoid(8), body: "", visible: true };
}

export function newSkillGroup(): SkillGroup {
  return { id: nanoid(8), name: "", skills: [] };
}

export function newContact() {
  return { id: nanoid(8), kind: "custom" as const, value: "" };
}

export function newSection(kind: SectionKind): Section {
  const base = { id: nanoid(8), visible: true } as const;
  switch (kind) {
    case "experience":
      return { ...base, kind, title: "Experience", items: [] };
    case "education":
      return { ...base, kind, title: "Education", items: [] };
    case "skills":
      return { ...base, kind, title: "Skills", display: "groups", groups: [] };
    case "projects":
      return { ...base, kind, title: "Projects", items: [] };
    case "custom":
      return { ...base, kind, title: "Custom Section", items: [] };
  }
}

export function newResume(name: string, templateId: TemplateId = "modern"): Resume {
  const template = getTemplate(templateId);
  const sections: Section[] = [
    newSection("experience"),
    newSection("education"),
    newSection("skills"),
  ];
  const now = new Date().toISOString();
  const inSide = (s: Section) =>
    template.defaultLayout.mode === "two-column" &&
    template.sideKinds.includes(s.kind);
  return {
    version: 1,
    id: nanoid(10),
    name,
    templateId,
    profile: { fullName: "", headline: "", contacts: [] },
    sections,
    layout: {
      ...template.defaultLayout,
      columns: {
        main: sections.filter((s) => !inSide(s)).map((s) => s.id),
        side: sections.filter(inSide).map((s) => s.id),
      },
    },
    themeOverrides: {},
    createdAt: now,
    updatedAt: now,
  };
}

// Seeded sample with realistic volume (~2 pages) so pagination, spacing and
// export can be exercised before any editing UI exists.
export function seedResume(): Resume {
  const experience: Section = {
    id: nanoid(8),
    kind: "experience",
    title: "Experience",
    visible: true,
    items: [
      {
        id: nanoid(8),
        role: "Senior Software Engineer",
        company: "King",
        location: "Stockholm, Sweden",
        startDate: "2021-03",
        current: true,
        summary:
          "Backend and tooling for a live-ops game platform serving hundreds of millions of players.",
        bullets: [
          "Designed and shipped a self-serve experimentation service used by 40+ game teams, cutting A/B test setup time from days to minutes.",
          "Led the migration of the segmentation pipeline from batch Hadoop jobs to a streaming architecture, reducing end-to-end latency from 6 hours to under 2 minutes.",
          "Drove adoption of contract testing across 12 microservices, eliminating a class of integration regressions from the release train.",
          "Mentored four engineers to promotion through structured pairing and design review practice.",
        ],
        visible: true,
      },
      {
        id: nanoid(8),
        role: "Software Engineer",
        company: "Spotify",
        location: "Stockholm, Sweden",
        startDate: "2017-08",
        endDate: "2021-02",
        summary:
          "Playlist infrastructure squad — storage, APIs and editorial tooling.",
        bullets: [
          "Built the collaborative-playlist conflict resolution layer handling 2M concurrent edit sessions.",
          "Reduced p99 latency of the playlist read path by 45% via request coalescing and a smarter cache-invalidation protocol.",
          "On-call lead for a tier-1 service; authored runbooks that cut mean incident resolution time by a third.",
        ],
        visible: true,
      },
      {
        id: nanoid(8),
        role: "Backend Developer",
        company: "Nordnet",
        location: "Stockholm, Sweden",
        startDate: "2014-06",
        endDate: "2017-07",
        summary: "Trading and portfolio services for a Nordic online bank.",
        bullets: [
          "Implemented real-time position and P&L calculation for the mobile trading app launch.",
          "Modernised the order-routing integration test suite, doubling deploy frequency.",
        ],
        visible: true,
      },
    ],
  };

  const projects: Section = {
    id: nanoid(8),
    kind: "projects",
    title: "Projects",
    visible: true,
    items: [
      {
        id: nanoid(8),
        name: "cv-manager",
        url: "https://github.com/danieltibbing/cv-manager",
        description:
          "This resume builder — local-first Next.js app with deterministic pagination and Puppeteer PDF export.",
        bullets: [],
        tech: ["Next.js", "React", "TypeScript", "Puppeteer"],
        visible: true,
      },
      {
        id: nanoid(8),
        name: "sthlm-transit-cli",
        url: "https://github.com/danieltibbing/sthlm-transit-cli",
        description:
          "Terminal client for Stockholm public transport departures with fuzzy stop search.",
        bullets: [],
        tech: ["Go", "SL API"],
        visible: true,
      },
    ],
  };

  const education: Section = {
    id: nanoid(8),
    kind: "education",
    title: "Education",
    visible: true,
    items: [
      {
        id: nanoid(8),
        degree: "MSc Computer Science",
        institution: "KTH Royal Institute of Technology",
        location: "Stockholm, Sweden",
        startDate: "2009",
        endDate: "2014",
        details: "Thesis on distributed consensus under partial network partitions.",
        visible: true,
      },
    ],
  };

  const skills: Section = {
    id: nanoid(8),
    kind: "skills",
    title: "Skills",
    visible: true,
    display: "groups",
    groups: [
      {
        id: nanoid(8),
        name: "Languages",
        skills: ["TypeScript", "Kotlin", "Go", "Python", "SQL"].map((name) => ({
          id: nanoid(8),
          name,
        })),
      },
      {
        id: nanoid(8),
        name: "Platforms & Tools",
        skills: ["Kubernetes", "GCP", "Kafka", "Terraform", "PostgreSQL"].map(
          (name) => ({ id: nanoid(8), name })
        ),
      },
      {
        id: nanoid(8),
        name: "Practices",
        skills: [
          "System design",
          "Incident response",
          "A/B experimentation",
          "Mentoring",
        ].map((name) => ({ id: nanoid(8), name })),
      },
    ],
  };

  const custom: Section = {
    id: nanoid(8),
    kind: "custom",
    title: "Talks & Writing",
    visible: true,
    items: [
      {
        id: nanoid(8),
        heading: "“Streaming segmentation at player scale”",
        sub: "GDC 2024, San Francisco",
        body: "Case study of moving a batch analytics pipeline to streaming without pausing live experiments.",
        visible: true,
      },
      {
        id: nanoid(8),
        heading: "Engineering blog",
        sub: "medium.com/@danieltibbing",
        body: "Occasional posts on backend architecture, developer tooling and print-quality CSS.",
        visible: true,
      },
    ],
  };

  const template = getTemplate("modern");
  const sections = [experience, projects, education, skills, custom];
  const now = new Date().toISOString();

  return {
    version: 1,
    id: nanoid(10),
    name: "Main resume",
    templateId: "modern",
    profile: {
      fullName: "Daniel Tibbing",
      headline: "Senior Software Engineer",
      summary:
        "Backend engineer with 10+ years building high-throughput services and developer platforms. I like owning problems end to end — from architecture sketches to on-call — and making other engineers faster along the way.",
      contacts: [
        { id: nanoid(8), kind: "email", value: "daniel.tibbing@example.com" },
        { id: nanoid(8), kind: "phone", value: "+46 70 123 45 67" },
        { id: nanoid(8), kind: "location", value: "Stockholm, Sweden" },
        { id: nanoid(8), kind: "linkedin", value: "linkedin.com/in/danieltibbing" },
        { id: nanoid(8), kind: "github", value: "github.com/danieltibbing" },
      ],
    },
    sections,
    layout: {
      ...template.defaultLayout,
      columns: { main: sections.map((s) => s.id), side: [] },
    },
    themeOverrides: {},
    createdAt: now,
    updatedAt: now,
  };
}
