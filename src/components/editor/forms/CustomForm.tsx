"use client";

import type { Section } from "@/lib/schema";
import { newCustomItem } from "@/lib/defaults";
import { AddButton, TextArea, TextInput } from "./fields";
import { ItemShell } from "./ItemShell";
import { moveItem, useSectionMutate } from "./sectionHelpers";

type CustomSection = Extract<Section, { kind: "custom" }>;

export function CustomForm({ section }: { section: CustomSection }) {
  const mutate = useSectionMutate(section.id, "custom");
  return (
    <div className="flex flex-col gap-3">
      {section.items.map((item, i) => (
        <ItemShell
          key={item.id}
          title={item.heading || "New entry"}
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
              label="Heading"
              value={item.heading ?? ""}
              onChange={(v) =>
                mutate((s) => void (s.items[i].heading = v || undefined))
              }
            />
            <TextInput
              label="Right-aligned note"
              placeholder="Date, place…"
              value={item.sub ?? ""}
              onChange={(v) => mutate((s) => void (s.items[i].sub = v || undefined))}
            />
          </div>
          <TextArea
            label="Body"
            rows={4}
            hint='Plain text. Lines starting with "- " become bullets.'
            value={item.body}
            onChange={(v) => mutate((s) => void (s.items[i].body = v))}
          />
        </ItemShell>
      ))}
      <AddButton onClick={() => mutate((s) => void s.items.push(newCustomItem()))}>
        + Add entry
      </AddButton>
    </div>
  );
}
