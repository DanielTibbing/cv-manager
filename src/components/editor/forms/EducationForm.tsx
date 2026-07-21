"use client";

import type { Section } from "@/lib/schema";
import { newEducationItem } from "@/lib/defaults";
import { AddButton, TextArea, TextInput } from "./fields";
import { ItemShell } from "./ItemShell";
import { moveItem, useSectionMutate } from "./sectionHelpers";

type EducationSection = Extract<Section, { kind: "education" }>;

export function EducationForm({ section }: { section: EducationSection }) {
  const mutate = useSectionMutate(section.id, "education");
  return (
    <div className="flex flex-col gap-3">
      {section.items.map((item, i) => (
        <ItemShell
          key={item.id}
          title={item.degree || item.institution || "New degree"}
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
              label="Degree"
              value={item.degree}
              onChange={(v) => mutate((s) => void (s.items[i].degree = v))}
            />
            <TextInput
              label="Institution"
              value={item.institution}
              onChange={(v) => mutate((s) => void (s.items[i].institution = v))}
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
                placeholder="2009"
                value={item.startDate ?? ""}
                onChange={(v) =>
                  mutate((s) => void (s.items[i].startDate = v || undefined))
                }
              />
              <TextInput
                label="End"
                placeholder="2014"
                value={item.endDate ?? ""}
                onChange={(v) =>
                  mutate((s) => void (s.items[i].endDate = v || undefined))
                }
              />
            </div>
          </div>
          <TextArea
            label="Details"
            rows={2}
            value={item.details ?? ""}
            onChange={(v) =>
              mutate((s) => void (s.items[i].details = v || undefined))
            }
          />
        </ItemShell>
      ))}
      <AddButton onClick={() => mutate((s) => void s.items.push(newEducationItem()))}>
        + Add education
      </AddButton>
    </div>
  );
}
