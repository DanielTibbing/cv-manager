"use client";

import { useRef, useState } from "react";

// Click-to-rename input for the manager lists: Enter/blur commits, Esc cancels.
// Replaces window.prompt so renaming feels like part of the page.
export function InlineRename({
  initial,
  onCommit,
  onCancel,
  className,
}: {
  initial: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(initial);
  const cancelled = useRef(false);

  const commit = () => {
    if (cancelled.current) return;
    const value = draft.trim();
    if (value && value !== initial) onCommit(value);
    else onCancel();
  };

  return (
    <input
      autoFocus
      aria-label="Rename"
      className={
        className ??
        "w-full rounded border border-blue-300 bg-white px-2 py-0.5 text-sm font-medium text-slate-800 focus:outline-none"
      }
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          cancelled.current = true;
          e.currentTarget.blur();
          onCancel();
        }
      }}
    />
  );
}
