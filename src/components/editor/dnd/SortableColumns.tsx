"use client";

// Thin adapter around dnd-kit's multi-container sortable pattern.
// Everything outside this file only knows onMove(sectionId, column, index)
// and receives opaque drag-handle props, so the DnD library is swappable
// (see plan: pragmatic-drag-and-drop fallback if dnd-kit stalls on a future
// React upgrade).

import type { HTMLAttributes, ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import type { ColumnKey } from "@/store/resumeStore";

// Spread onto the element that should initiate a drag (the grip icon), so
// form fields inside a card stay freely clickable.
export type DragHandleProps = HTMLAttributes<HTMLElement>;

interface SortableColumnsProps {
  columns: { main: string[]; side: string[] };
  mode: "single" | "two-column";
  renderItem: (id: string, handleProps: DragHandleProps) => ReactNode;
  onMove: (sectionId: string, toColumn: ColumnKey, toIndex: number) => void;
}

function SortableItem({
  id,
  renderItem,
}: {
  id: string;
  renderItem: SortableColumnsProps["renderItem"];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {renderItem(id, {
        ...attributes,
        ...listeners,
        style: { cursor: "grab", touchAction: "none" },
      } as DragHandleProps)}
    </div>
  );
}

function Column({
  columnKey,
  ids,
  label,
  renderItem,
}: {
  columnKey: ColumnKey;
  ids: string[];
  label?: string;
  renderItem: SortableColumnsProps["renderItem"];
}) {
  // The column itself is droppable so items can be dragged into an empty column.
  const { setNodeRef } = useDroppable({ id: columnKey });
  return (
    <div>
      {label && (
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </div>
      )}
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-10 flex-col gap-2">
          {ids.map((id) => (
            <SortableItem key={id} id={id} renderItem={renderItem} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function SortableColumns({
  columns,
  mode,
  renderItem,
  onMove,
}: SortableColumnsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columnOf = (id: string): ColumnKey | null => {
    if (columns.main.includes(id)) return "main";
    if (columns.side.includes(id)) return "side";
    return null;
  };

  const handleDragStart = (event: DragStartEvent) =>
    setActiveId(event.active.id as string);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const sectionId = active.id as string;
    const overId = over.id as string;
    if (sectionId === overId) return;

    // Dropped on a column container (possibly empty) → append; dropped on an
    // item → take that item's slot.
    const toColumn =
      overId === "main" || overId === "side"
        ? (overId as ColumnKey)
        : columnOf(overId);
    if (!toColumn) return;
    const toIndex =
      overId === toColumn
        ? columns[toColumn].length
        : columns[toColumn].indexOf(overId);
    onMove(sectionId, toColumn, Math.max(toIndex, 0));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex flex-col gap-4">
        <Column
          columnKey="main"
          ids={columns.main}
          label={mode === "two-column" ? "Main column" : undefined}
          renderItem={renderItem}
        />
        {mode === "two-column" && (
          <Column
            columnKey="side"
            ids={columns.side}
            label="Side column"
            renderItem={renderItem}
          />
        )}
      </div>
      <DragOverlay>{activeId ? renderItem(activeId, {}) : null}</DragOverlay>
    </DndContext>
  );
}
