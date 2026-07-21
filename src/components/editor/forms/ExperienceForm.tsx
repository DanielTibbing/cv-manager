"use client";

import type { ExperienceItem, Section } from "@/lib/schema";
import { newExperienceItem, newSubPosition } from "@/lib/defaults";
import { AddButton, SmallButton, TextArea, TextInput } from "./fields";
import { ItemShell } from "./ItemShell";
import { moveItem, useSectionMutate } from "./sectionHelpers";

type ExperienceSection = Extract<Section, { kind: "experience" }>;

// Nested client engagements (consultant positions) under one employer entry.
function SubPositionsEditor({
  item,
  mutateItem,
}: {
  item: ExperienceItem;
  mutateItem: (fn: (item: ExperienceItem) => void) => void;
}) {
  const subs = item.subPositions ?? [];
  return (
    <div>
      <span className="mb-0.5 block text-xs font-medium text-slate-500">
        Consultant positions
      </span>
      {subs.length > 0 && (
        <TextInput
          label="List label"
          placeholder="Consultant positions"
          value={item.subPositionsLabel ?? ""}
          onChange={(v) =>
            mutateItem((it) => void (it.subPositionsLabel = v || undefined))
          }
        />
      )}
      <div className="mt-1.5 flex flex-col gap-1.5">
        {subs.map((sp, j) => (
          <div
            key={sp.id}
            className={`rounded border border-slate-200 bg-white p-1.5 ${
              sp.visible ? "" : "opacity-60"
            }`}
          >
            <div className="mb-1 flex items-center gap-1">
              <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
                {sp.role || sp.client || "New position"}
              </span>
              <SmallButton
                title={sp.visible ? "Hide" : "Show"}
                onClick={() =>
                  mutateItem(
                    (it) =>
                      void (it.subPositions![j].visible =
                        !it.subPositions![j].visible)
                  )
                }
              >
                {sp.visible ? "👁" : "🚫"}
              </SmallButton>
              <SmallButton
                danger
                title="Remove position"
                onClick={() =>
                  mutateItem((it) => void it.subPositions!.splice(j, 1))
                }
              >
                ✕
              </SmallButton>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <TextInput
                label="Role"
                value={sp.role}
                onChange={(v) =>
                  mutateItem((it) => void (it.subPositions![j].role = v))
                }
              />
              <TextInput
                label="Client"
                value={sp.client}
                onChange={(v) =>
                  mutateItem((it) => void (it.subPositions![j].client = v))
                }
              />
              <TextInput
                label="Location"
                value={sp.location ?? ""}
                onChange={(v) =>
                  mutateItem(
                    (it) => void (it.subPositions![j].location = v || undefined)
                  )
                }
              />
              <div className="grid grid-cols-2 gap-1.5">
                <TextInput
                  label="Start"
                  placeholder="2020-02"
                  value={sp.startDate ?? ""}
                  onChange={(v) =>
                    mutateItem(
                      (it) =>
                        void (it.subPositions![j].startDate = v || undefined)
                    )
                  }
                />
                <TextInput
                  label="End"
                  placeholder="2021-06"
                  value={sp.endDate ?? ""}
                  onChange={(v) =>
                    mutateItem(
                      (it) => void (it.subPositions![j].endDate = v || undefined)
                    )
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <AddButton
        onClick={() =>
          mutateItem((it) => {
            it.subPositions = [...(it.subPositions ?? []), newSubPosition()];
          })
        }
      >
        + Add consultant position
      </AddButton>
    </div>
  );
}

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
          <SubPositionsEditor
            item={item}
            mutateItem={(fn) => mutate((s) => fn(s.items[i]))}
          />
        </ItemShell>
      ))}
      <AddButton onClick={() => mutate((s) => void s.items.push(newExperienceItem()))}>
        + Add experience
      </AddButton>
    </div>
  );
}
