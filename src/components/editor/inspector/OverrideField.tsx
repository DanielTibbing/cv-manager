"use client";

// Number field for an optional override: empty shows the template default as
// placeholder; the ↺ button clears the override so the token cascades again.

export function OverrideNumber({
  label,
  unit,
  value,
  fallback,
  step = 0.5,
  min = 0,
  max,
  onChange,
}: {
  label: string;
  unit?: string;
  value: number | undefined;
  fallback: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (value: number | undefined) => void;
}) {
  const overridden = value !== undefined;
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
        {label}
        {unit && <span className="text-slate-400"> ({unit})</span>}
      </span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          className={`w-16 rounded border px-1.5 py-0.5 text-right text-xs focus:border-blue-400 focus:outline-none ${
            overridden
              ? "border-blue-300 bg-blue-50 text-slate-800"
              : "border-slate-300 bg-white text-slate-600"
          }`}
          value={value ?? ""}
          placeholder={String(fallback)}
          step={step}
          min={min}
          max={max}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
        <button
          type="button"
          title="Reset to template default"
          disabled={!overridden}
          onClick={() => onChange(undefined)}
          className="rounded px-1 text-xs text-slate-400 hover:bg-slate-100 disabled:invisible"
        >
          ↺
        </button>
      </span>
    </label>
  );
}
