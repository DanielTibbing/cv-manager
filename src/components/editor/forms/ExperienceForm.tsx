"use client";

import type { Section } from "@/lib/schema";
import { newExperienceItem } from "@/lib/defaults";
import { AddButton, TextArea, TextInput } from "./fields";
import { ItemShell } from "./ItemShell";
import { moveItem, useSectionMutate } from "./sectionHelpers";

type ExperienceSection = Extract<Section, { kind: "experience" }>;

export function ExperienceForm({ section }: { section: ExperienceSection }) {
  const mutate = useSectionMutate(section.id, "experience");
  return (
    <div className="flex flex-col gap-3">
      {section.items.map((item, i) => (
        <ItemShell
          key={item.id}
          title={item.role || item.company || "New role"}
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
              label="Role"
              value={item.role}
              onChange={(v) => mutate((s) => void (s.items[i].role = v))}
            />
            <TextInput
              label="Company"
              value={item.company}
              onChange={(v) => mutate((s) => void (s.items[i].company = v))}
            />
            <TextInput
              label="Location"
              value={item.location ?? ""}
              onChange={(v) =>
                mutate((s) => void (s.items[i].location = v || undefined))
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <TextInput
                label="Start"
                placeholder="2021-03"
                value={item.startDate ?? ""}
                onChange={(v) =>
                  mutate((s) => void (s.items[i].startDate = v || undefined))
                }
              />
              <TextInput
                label={item.current ? "End (—)" : "End"}
                placeholder="2024-06"
                value={item.current ? "" : item.endDate ?? ""}
                onChange={(v) =>
                  mutate((s) => void (s.items[i].endDate = v || undefined))
                }
              />
            </div>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={item.current ?? false}
              onChange={(e) =>
                mutate((s) => void (s.items[i].current = e.target.checked))
              }
            />
            Current position
          </label>
          <TextArea
            label="Summary"
            rows={2}
            value={item.summary ?? ""}
            onChange={(v) =>
              mutate((s) => void (s.items[i].summary = v || undefined))
            }
          />
          <TextArea
            label="Bullets"
            rows={5}
            hint="One bullet per line."
            value={item.bullets.join("\n")}
            onChange={(v) => mutate((s) => void (s.items[i].bullets = v.split("\n")))}
          />
        </ItemShell>
      ))}
      <AddButton onClick={() => mutate((s) => void s.items.push(newExperienceItem()))}>
        + Add experience
      </AddButton>
    </div>
  );
}
