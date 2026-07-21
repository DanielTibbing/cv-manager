"use client";

import { useResumeStore } from "@/store/resumeStore";

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex overflow-hidden rounded border border-slate-300">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`px-2 py-0.5 text-xs ${
              option.value === value
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LayoutControls() {
  const layout = useResumeStore((s) => s.resume?.layout);
  const update = useResumeStore((s) => s.update);
  const setLayoutMode = useResumeStore((s) => s.setLayoutMode);
  if (!layout) return null;

  const twoCol = layout.mode === "two-column";

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
        Layout
      </span>
      <div className="flex flex-col gap-2">
        <Segmented
          label="Columns"
          value={layout.mode}
          options={[
            { value: "single", label: "Single" },
            { value: "two-column", label: "Two-column" },
          ]}
          onChange={setLayoutMode}
        />
        {twoCol && (
          <>
            <Segmented
              label="Sidebar"
              value={layout.sidePosition}
              options={[
                { value: "left", label: "Left" },
                { value: "right", label: "Right" },
              ]}
              onChange={(v) => update((d) => void (d.layout.sidePosition = v))}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">Sidebar width</span>
              <span className="text-xs text-slate-600">
                {layout.sideColumnWidthPercent}% — drag the divider in the preview
              </span>
            </div>
          </>
        )}
        <Segmented
          label="Header"
          value={layout.headerPlacement}
          options={[
            { value: "banner", label: "Full-width" },
            { value: "in-main", label: "In main column" },
          ]}
          onChange={(v) => update((d) => void (d.layout.headerPlacement = v))}
        />
      </div>
    </div>
  );
}
