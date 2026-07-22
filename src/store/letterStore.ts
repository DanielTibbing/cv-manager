"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import type { Letter } from "@/lib/schema";

export type SaveState = "idle" | "saving" | "saved" | "error" | "conflict";

interface LetterEditorState {
  letter: Letter | null;
  saveState: SaveState;
  // Last server-acknowledged version — sent as the save's base version so a
  // stale tab gets a 409 instead of clobbering. Lives outside the document
  // (and outside zundo's partialize) so acking a save neither re-triggers
  // autosave nor pollutes undo history.
  serverUpdatedAt: string | null;
  load: (letter: Letter) => void;
  update: (mutate: (draft: Letter) => void) => void;
  ackSave: (updatedAt: string) => void;
  setSaveState: (saveState: SaveState) => void;
}

export const useLetterStore = create<LetterEditorState>()(
  temporal(
    immer((set) => ({
      letter: null,
      saveState: "idle",
      serverUpdatedAt: null,

      load: (letter) =>
        set((state) => {
          state.letter = letter;
          state.saveState = "idle";
          state.serverUpdatedAt = letter.updatedAt;
        }),

      update: (mutate) =>
        set((state) => {
          if (state.letter) mutate(state.letter);
        }),

      ackSave: (updatedAt) =>
        set((state) => {
          state.serverUpdatedAt = updatedAt;
          state.saveState = "saved";
        }),

      setSaveState: (saveState) => set({ saveState }),
    })),
    {
      partialize: (state) => ({ letter: state.letter }),
      equality: (a, b) => a.letter === b.letter,
      limit: 200,
      // Group rapid keystrokes into one history entry (same as resumeStore).
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
