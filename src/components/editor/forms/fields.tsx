"use client";

// Small styled form primitives shared by all section forms.

import { useState, type ReactNode } from "react";

const inputCls =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 focus:border-blue-400 focus:outline-none";

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className ?? ""}`}>
      <span className="mb-0.5 block text-xs font-medium text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Field label={label} className={className}>
      <input
        className={inputCls}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <Field label={label}>
      <textarea
        className={`${inputCls} resize-y`}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <span className="mt-0.5 block text-xs text-slate-400">{hint}</span>}
    </Field>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <Field label={label} className={className}>
      <select
        className={inputCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

// For comma-separated list fields: edits are held locally while focused and
// committed on blur, so partially typed lists ("Kotlin, ") aren't reparsed
// under the cursor.
export function CommitInput({
  label,
  value,
  onCommit,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  // Adjust-state-during-render pattern: when the committed value changes
  // externally (undo, template switch) and the field isn't being edited,
  // resync the draft.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (!focused) setDraft(value);
  }
  return (
    <Field label={label}>
      <input
        className={inputCls}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (draft !== value) onCommit(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      {hint && <span className="mt-0.5 block text-xs text-slate-400">{hint}</span>}
    </Field>
  );
}

export function SmallButton({
  onClick,
  title,
  children,
  disabled,
  danger,
}: {
  onClick: () => void;
  title?: string;
  children: ReactNode;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded px-1.5 py-0.5 text-xs disabled:opacity-30 ${
        danger
          ? "text-red-500 hover:bg-red-50"
          : "text-slate-500 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

export function AddButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 w-full rounded border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600"
    >
      {children}
    </button>
  );
}
