"use client";

import { nanoid } from "nanoid";
import type { Section, SkillGroup } from "@/lib/schema";
import { newSkillGroup } from "@/lib/defaults";
import { AddButton, CommitInput, Select, TextInput } from "./fields";
import { ItemShell } from "./ItemShell";
import { moveItem, useSectionMutate } from "./sectionHelpers";

type SkillsSection = Extract<Section, { kind: "skills" }>;

function formatSkills(skills: SkillGroup["skills"]): string {
  return skills
    .map((s) => (s.level != null ? `${s.name}:${s.level}` : s.name))
    .join(", ");
}

function parseSkills(text: string): SkillGroup["skills"] {
  return text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const withLevel = /^(.*?):([1-5])$/.exec(t);
      return withLevel
        ? {
            id: nanoid(8),
            name: withLevel[1].trim(),
            level: Number(withLevel[2]) as 1 | 2 | 3 | 4 | 5,
          }
        : { id: nanoid(8), name: t };
    });
}

export function SkillsForm({ section }: { section: SkillsSection }) {
  const mutate = useSectionMutate(section.id, "skills");
  return (
    <div className="flex flex-col gap-3">
      <Select
        label="Display"
        value={section.display}
        onChange={(v) =>
          mutate((s) => void (s.display = v as SkillsSection["display"]))
        }
        options={[
          { value: "groups", label: "Grouped lists" },
          { value: "tags", label: "Tag cloud" },
          { value: "bars", label: "Level dots" },
        ]}
      />
      {section.groups.map((group, i) => (
        <ItemShell
          key={group.id}
          title={group.name || "New group"}
          visible
          canUp={i > 0}
          canDown={i < section.groups.length - 1}
          onMove={(d) => mutate((s) => moveItem(s.groups, i, i + d))}
          onRemove={() => mutate((s) => void s.groups.splice(i, 1))}
        >
          <TextInput
            label="Group name"
            value={group.name}
            onChange={(v) => mutate((s) => void (s.groups[i].name = v))}
          />
          <CommitInput
            label="Skills"
            hint='Comma-separated. Optional level 1–5 for "Level dots": "Kotlin:4, Go:3".'
            value={formatSkills(group.skills)}
            onCommit={(v) => mutate((s) => void (s.groups[i].skills = parseSkills(v)))}
          />
        </ItemShell>
      ))}
      <AddButton onClick={() => mutate((s) => void s.groups.push(newSkillGroup()))}>
        + Add group
      </AddButton>
    </div>
  );
}
