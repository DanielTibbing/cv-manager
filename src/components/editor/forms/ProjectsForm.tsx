"use client";

import type { Section } from "@/lib/schema";
import { newProjectItem } from "@/lib/defaults";
import { AddButton, CommitInput, TextArea, TextInput } from "./fields";
import { ItemShell } from "./ItemShell";
import { moveItem, useSectionMutate } from "./sectionHelpers";

type ProjectsSection = Extract<Section, { kind: "projects" }>;

export function ProjectsForm({ section }: { section: ProjectsSection }) {
  const mutate = useSectionMutate(section.id, "projects");
  return (
    <div className="flex flex-col gap-3">
      {section.items.map((item, i) => (
        <ItemShell
          key={item.id}
          title={item.name || "New project"}
          visible={item.visible}
          canUp={i > 0}
          canDown={i < section.items.length - 1}
          onMove={(d) => mutate((s) => moveItem(s.items, i, i + d))}
          onToggleVisible={() =>
            mutate((s) => void (s.items[i].visible = !s.items[i].visible))
          }
          onRemove={() => mutate((s) => void s.items.splice(i, 1))}
        >
          <div className="grid grid-cols-2 gap-2">
            <TextInput
              label="Name"
              value={item.name}
              onChange={(v) => mutate((s) => void (s.items[i].name = v))}
            />
            <TextInput
              label="URL"
              value={item.url ?? ""}
              onChange={(v) => mutate((s) => void (s.items[i].url = v || undefined))}
            />
          </div>
          <TextArea
            label="Description"
            rows={2}
            value={item.description ?? ""}
            onChange={(v) =>
              mutate((s) => void (s.items[i].description = v || undefined))
            }
          />
          <TextArea
            label="Bullets"
            rows={3}
            hint="One bullet per line."
            value={item.bullets.join("\n")}
            onChange={(v) => mutate((s) => void (s.items[i].bullets = v.split("\n")))}
          />
          <CommitInput
            label="Tech"
            hint="Comma-separated."
            value={item.tech.join(", ")}
            onCommit={(v) =>
              mutate(
                (s) =>
                  void (s.items[i].tech = v
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean))
              )
            }
          />
        </ItemShell>
      ))}
      <AddButton onClick={() => mutate((s) => void s.items.push(newProjectItem()))}>
        + Add project
      </AddButton>
    </div>
  );
}
