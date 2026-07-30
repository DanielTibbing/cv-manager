"use client";

import { useRef, useState } from "react";
import type {
  ImportConflict,
  ImportPlan,
  ImportSummary,
  Resolution,
} from "@/lib/backup-types";

const CHOICES: { value: Resolution; label: string }[] = [
  { value: "existing", label: "Keep existing" },
  { value: "imported", label: "Use imported" },
  { value: "both", label: "Keep both" },
];

function summarize(s: ImportSummary): string {
  const parts: string[] = [];
  if (s.added) parts.push(`added ${s.added}`);
  if (s.replaced) parts.push(`replaced ${s.replaced}`);
  if (s.keptBoth) parts.push(`kept both for ${s.keptBoth}`);
  if (s.skipped) parts.push(`skipped ${s.skipped} unchanged`);
  if (s.uploadsAdded) parts.push(`${s.uploadsAdded} upload(s)`);
  return parts.length
    ? `Import complete: ${parts.join(" · ")}`
    : "Nothing to import — everything is already up to date.";
}

// "Import data" button + OS-copy-style conflict resolution. Uploads the zip
// for analysis first; only when name conflicts exist does the modal appear,
// letting the user pick per item before the merge is applied.
export function ImportData({ onImported }: { onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [conflicts, setConflicts] = useState<ImportConflict[] | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  const [busy, setBusy] = useState(false);

  const post = async (
    mode: "analyze" | "apply",
    archive: File,
    res?: Record<string, Resolution>
  ) => {
    const form = new FormData();
    form.append("file", archive);
    form.append("mode", mode);
    if (res) form.append("resolutions", JSON.stringify(res));
    const response = await fetch("/api/backup/import", {
      method: "POST",
      body: form,
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Import failed");
    return body;
  };

  const onFilePicked = async (picked: File) => {
    setBusy(true);
    try {
      const plan: ImportPlan = await post("analyze", picked);
      if (plan.conflicts.length === 0) {
        window.alert(summarize(await post("apply", picked)));
        onImported();
      } else {
        setFile(picked);
        setConflicts(plan.conflicts);
        setResolutions(
          Object.fromEntries(
            plan.conflicts.map((c) => [c.importedId, "existing" as Resolution])
          )
        );
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const apply = async () => {
    if (!file) return;
    setBusy(true);
    try {
      window.alert(summarize(await post("apply", file, resolutions)));
      setConflicts(null);
      setFile(null);
      onImported();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) onFilePicked(picked);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {busy ? "Importing…" : "Import data"}
      </button>

      {conflicts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
          <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800">
              Resolve conflicts
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              These items exist both here and in the backup, with different
              changes. Choose which version to keep for each.
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {conflicts.map((c) => (
                <li
                  key={c.importedId}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <div className="text-sm font-medium text-slate-800">
                    {c.name}
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {c.kind}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Existing updated{" "}
                    {new Date(c.existingUpdatedAt).toLocaleString()} · imported
                    updated {new Date(c.importedUpdatedAt).toLocaleString()}
                  </div>
                  <div className="mt-2 flex gap-2">
                    {CHOICES.map((choice) => (
                      <label
                        key={choice.value}
                        className={`cursor-pointer rounded px-2 py-1 text-xs ${
                          resolutions[c.importedId] === choice.value
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name={c.importedId}
                          value={choice.value}
                          checked={resolutions[c.importedId] === choice.value}
                          onChange={() =>
                            setResolutions((r) => ({
                              ...r,
                              [c.importedId]: choice.value,
                            }))
                          }
                          className="hidden"
                        />
                        {choice.label}
                      </label>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setConflicts(null);
                  setFile(null);
                }}
                className="rounded px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={apply}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? "Importing…" : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
