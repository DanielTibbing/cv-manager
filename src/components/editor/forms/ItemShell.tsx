"use client";

// Wrapper around one editable item (a job entry, a degree, …) with the
// shared controls: reorder, hide-without-deleting, remove.

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from "lucide-react";
import { SmallButton } from "./fields";

export function ItemShell({
  title,
  visible,
  canUp,
  canDown,
  onMove,
  onToggleVisible,
  onRemove,
  children,
}: {
  title: string;
  visible: boolean;
  canUp: boolean;
  canDown: boolean;
  onMove: (delta: -1 | 1) => void;
  onToggleVisible?: () => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded border border-slate-200 bg-slate-50 p-2 ${
        visible ? "" : "opacity-60"
      }`}
    >
      <div className="mb-2 flex items-center gap-1">
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-600">
          {title}
        </span>
        <SmallButton title="Move up" disabled={!canUp} onClick={() => onMove(-1)}>
          <ArrowUp className="h-3.5 w-3.5" />
        </SmallButton>
        <SmallButton
          title="Move down"
          disabled={!canDown}
          onClick={() => onMove(1)}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </SmallButton>
        {onToggleVisible && (
          <SmallButton
            title={visible ? "Hide item" : "Show item"}
            onClick={onToggleVisible}
          >
            {visible ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </SmallButton>
        )}
        <SmallButton title="Remove item" danger onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </SmallButton>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
