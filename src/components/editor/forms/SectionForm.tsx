"use client";

import type { Section } from "@/lib/schema";
import { useResumeStore } from "@/store/resumeStore";
import { SpacingInspector } from "../inspector/SpacingInspector";
import { TextInput } from "./fields";
import { ExperienceForm } from "./ExperienceForm";
import { EducationForm } from "./EducationForm";
import { SkillsForm } from "./SkillsForm";
import { ProjectsForm } from "./ProjectsForm";
import { CustomForm } from "./CustomForm";

function KindForm({ section }: { section: Section }) {
  switch (section.kind) {
    case "experience":
      return <ExperienceForm section={section} />;
    case "education":
      return <EducationForm section={section} />;
    case "skills":
      return <SkillsForm section={section} />;
    case "projects":
      return <ProjectsForm section={section} />;
    case "custom":
      return <CustomForm section={section} />;
  }
}

export function SectionForm({ section }: { section: Section }) {
  const update = useResumeStore((s) => s.update);
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 p-3">
      <TextInput
        label="Section title"
        value={section.title}
        onChange={(v) =>
          update((d) => {
            const target = d.sections.find((s) => s.id === section.id);
            if (target) target.title = v;
          })
        }
      />
      <SpacingInspector section={section} />
      <KindForm section={section} />
    </div>
  );
}
