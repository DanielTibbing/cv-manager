"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { current } from "immer";
import { temporal } from "zundo";
import type { Resume, SectionKind, TemplateId } from "@/lib/schema";
import { newSection } from "@/lib/defaults";
import { applyTemplate } from "@/lib/templates";

export type ColumnKey = "main" | "side";
export type SaveState = "idle" | "saving" | "saved" | "error" | "conflict";

interface EditorState {
  resume: Resume | null;
  saveState: SaveState;
  // Last server-acknowledged version, sent as the save's base version so a
  // stale tab gets a 409 instead of clobbering (kept outside undo history).
  serverUpdatedAt: string | null;
  ackSave: (updatedAt: string) => void;
  load: (resume: Resume) => void;
  // General-purpose edit: mutate the draft, autosave is scheduled by the
  // store subscription in EditorShell.
  update: (mutate: (draft: Resume) => void) => void;
  moveSection: (sectionId: string, toColumn: ColumnKey, toIndex: number) => void;
  setLayoutMode: (mode: Resume["layout"]["mode"]) => void;
  switchTemplate: (templateId: TemplateId) => void;
  toggleSectionVisible: (sectionId: string) => void;
  addSection: (kind: SectionKind) => string;
  removeSection: (sectionId: string) => void;
  setSaveState: (saveState: SaveState) => void;
}

export const useResumeStore = create<EditorState>()(
  temporal(
    immer((set) => ({
      resume: null,
      saveState: "idle",
      serverUpdatedAt: null,

      ackSave: (updatedAt) =>
        set((state) => {
          state.serverUpdatedAt = updatedAt;
          state.saveState = "saved";
        }),

      load: (resume) =>
        set((state) => {
          state.resume = resume;
          state.saveState = "idle";
          state.serverUpdatedAt = resume.updatedAt;
        }),

      update: (mutate) =>
        set((state) => {
          if (state.resume) mutate(state.resume);
        }),

      moveSection: (sectionId, toColumn, toIndex) =>
        set((state) => {
          const layout = state.resume?.layout;
          if (!layout) return;
          for (const key of ["main", "side"] as const) {
            const idx = layout.columns[key].indexOf(sectionId);
            if (idx !== -1) layout.columns[key].splice(idx, 1);
          }
          const target = layout.columns[toColumn];
          target.splice(Math.min(toIndex, target.length), 0, sectionId);
        }),

      // Non-destructive: content untouched, section ids re-slotted per the
      // template's default layout, themeOverrides reset (caller confirms).
      switchTemplate: (templateId) =>
        set((state) => {
          if (!state.resume) return;
          state.resume = applyTemplate(current(state.resume), templateId);
        }),

      setLayoutMode: (mode) =>
        set((state) => {
          const layout = state.resume?.layout;
          if (!layout || layout.mode === mode) return;
          layout.mode = mode;
          if (mode === "single") {
            // Side sections would become unreachable — fold them into main.
            layout.columns.main.push(...layout.columns.side);
            layout.columns.side = [];
          }
        }),

      toggleSectionVisible: (sectionId) =>
        set((state) => {
          const section = state.resume?.sections.find((s) => s.id === sectionId);
          if (section) section.visible = !section.visible;
        }),

      addSection: (kind) => {
        const section = newSection(kind);
        set((state) => {
          if (!state.resume) return;
          state.resume.sections.push(section);
          state.resume.layout.columns.main.push(section.id);
        });
        return section.id;
      },

      removeSection: (sectionId) =>
        set((state) => {
          if (!state.resume) return;
          state.resume.sections = state.resume.sections.filter(
            (s) => s.id !== sectionId
          );
          for (const key of ["main", "side"] as const) {
            state.resume.layout.columns[key] =
              state.resume.layout.columns[key].filter((id) => id !== sectionId);
          }
        }),

      setSaveState: (saveState) => set({ saveState }),
    })),
    {
      // Undo/redo tracks only document changes, not save-status churn.
      partialize: (state) => ({ resume: state.resume }),
      equality: (a, b) => a.resume === b.resume,
      limit: 200,
      // Group rapid keystrokes into one history entry: snapshots are recorded
      // at most every 600ms, so undo steps over whole edits, not characters.
      handleSet: (handleSet) => {
        let lastRecorded = 0;
        return ((...args: Parameters<typeof handleSet>) => {
          const now = Date.now();
          if (now - lastRecorded < 600) return;
          lastRecorded = now;
          handleSet(...args);
        }) as typeof handleSet;
      },
    }
  )
);
