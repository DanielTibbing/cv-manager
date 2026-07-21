"use client";

import type { Section, SectionKind } from "@/lib/schema";
import { useResumeStore } from "@/store/resumeStore";

// Scoped mutator: forms edit their own section on the store draft without
// re-finding it at every call site (and with the kind narrowed).
export function useSectionMutate<K extends SectionKind>(
  sectionId: string,
  kind: K
) {
  const update = useResumeStore((s) => s.update);
  return (fn: (section: Extract<Section, { kind: K }>) => void) =>
    update((draft) => {
      const section = draft.sections.find((s) => s.id === sectionId);
      if (section && section.kind === kind) {
        fn(section as Extract<Section, { kind: K }>);
      }
    });
}

export function moveItem<T>(arr: T[], from: number, to: number) {
  if (to < 0 || to >= arr.length) return;
  const [item] = arr.splice(from, 1);
  arr.splice(to, 0, item);
}
