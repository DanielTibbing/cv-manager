"use client";

// Debounced whole-document autosave shared by the resume and letter editors.
// Any document change (edits, reorders, undo/redo) is PUT 800ms after the
// last change. When getBaseUpdatedAt is provided, the save carries the last
// server-acknowledged version and a 409 response surfaces as "conflict"
// instead of silently clobbering newer data (the stale-tab problem).

import { useEffect, useRef } from "react";

export type AutosaveState = "saving" | "saved" | "error" | "conflict";

interface Doc {
  id: string;
  updatedAt: string;
}

export function useDocumentAutosave<T extends Doc>(opts: {
  subscribeDoc: (
    listener: (next: T | null, prev: T | null) => void
  ) => () => void;
  getDoc: () => T | null;
  endpoint: (id: string) => string;
  getBaseUpdatedAt?: () => string | undefined;
  setSaveState: (state: AutosaveState) => void;
  onSaved?: (saved: T) => void;
}) {
  // Options captured in a ref so the subscription is set up exactly once;
  // the ref is refreshed after every render (callbacks read it at call time).
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = optsRef.current.subscribeDoc((next, prev) => {
      if (!next || !prev || prev === next) return;
      if (prev.id !== next.id) return; // a different document was loaded
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        const o = optsRef.current;
        const doc = o.getDoc();
        if (!doc) return;
        o.setSaveState("saving");
        try {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          const base = o.getBaseUpdatedAt?.();
          if (base) headers["x-base-updated-at"] = base;
          const res = await fetch(o.endpoint(doc.id), {
            method: "PUT",
            headers,
            body: JSON.stringify(doc),
          });
          if (res.status === 409) {
            o.setSaveState("conflict");
            return;
          }
          if (!res.ok) {
            o.setSaveState("error");
            return;
          }
          const saved = (await res.json()) as T;
          if (o.onSaved) o.onSaved(saved);
          else o.setSaveState("saved");
        } catch {
          o.setSaveState("error");
        }
      }, 800);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);
}
