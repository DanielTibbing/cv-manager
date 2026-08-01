"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { ArrowLeft, FileDown, Redo2, Undo2, X } from "lucide-react";
import type { Letter, LetterStatus, Resume, ResumeIndexEntry } from "@/lib/schema";
import { useLetterStore } from "@/store/letterStore";
import { useDocumentAutosave } from "@/components/editor/useDocumentAutosave";
import { isMacOS } from "@/lib/platform";
import { Select, TextArea, TextInput } from "@/components/editor/forms/fields";
import { LetterDocument } from "./LetterDocument";
import { findMissing } from "@/lib/letters/placeholders";

const SAVE_LABEL: Record<string, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Save failed — retrying on next change",
  conflict: "⚠ Edited elsewhere — reload this tab to continue",
};

const STATUS_OPTIONS: { value: LetterStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </span>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

// Autosave state as a colored dot + label, legible at a glance.
function SaveStatus({ state }: { state: string }) {
  if (state === "idle") return null;
  const dot =
    state === "saving"
      ? "bg-amber-400 animate-pulse"
      : state === "saved"
        ? "bg-green-500"
        : "bg-red-500";
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-400">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {SAVE_LABEL[state]}
    </span>
  );
}

export function LetterEditorShell({
  initial,
  initialResume,
  resumes,
}: {
  initial: Letter;
  initialResume: Resume | null;
  resumes: Pick<ResumeIndexEntry, "id" | "name">[];
}) {
  const letter = useLetterStore((s) => s.letter);
  const saveState = useLetterStore((s) => s.saveState);
  const load = useLetterStore((s) => s.load);
  const update = useLetterStore((s) => s.update);
  const { undo, redo, pastStates, futureStates, clear } = useStore(
    useLetterStore.temporal
  );

  const [linkedResume, setLinkedResume] = useState<Resume | null>(initialResume);
  const [showJd, setShowJd] = useState(false);
  const [editJd, setEditJd] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<
    | { ok: true; fileName: string; filePath: string }
    | { ok: false; error: string }
    | null
  >(null);

  useDocumentAutosave({
    subscribeDoc: (listener) =>
      useLetterStore.subscribe((state, prev) =>
        listener(state.letter, prev.letter)
      ),
    getDoc: () => useLetterStore.getState().letter,
    endpoint: (id) => `/api/letters/${id}`,
    getBaseUpdatedAt: () =>
      useLetterStore.getState().serverUpdatedAt ?? undefined,
    setSaveState: (s) => useLetterStore.getState().setSaveState(s),
    onSaved: (saved) => useLetterStore.getState().ackSave(saved.updatedAt),
  });

  useEffect(() => {
    load(initial);
    clear(); // the initial load is not an undoable edit
  }, [initial, load, clear]);

  if (!letter) return null;

  const missing = findMissing(letter);

  const relink = async (resumeId: string) => {
    if (!resumeId) return;
    const res = await fetch(`/api/resumes/${resumeId}`);
    if (!res.ok) return;
    setLinkedResume(await res.json());
    update((d) => {
      d.resumeId = resumeId;
      d.snapshot = undefined; // live link again — drop the frozen copy
    });
  };

  const handleExport = async () => {
    setExporting(true);
    setExportResult(null);
    try {
      const res = await fetch(`/api/export/letter/${letter.id}`, {
        method: "POST",
      });
      if (res.ok) {
        const body = await res.json();
        setExportResult({ ok: true, fileName: body.fileName, filePath: body.filePath });
      } else {
        // Production Next.js may return plain-text errors; try JSON first,
        // fall back to the raw text so the real error surfaces in the UI.
        let error: string;
        try {
          const body = await res.json();
          error = body.error || `Export failed (${res.status})`;
        } catch {
          error = (await res.text()) || `Export failed (${res.status})`;
        }
        setExportResult({ ok: false, error });
      }
    } catch (err) {
      setExportResult({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Letters
        </Link>
        <input
          className="w-72 rounded border border-transparent px-2 py-1 text-sm font-semibold hover:border-slate-200 focus:border-slate-300 focus:outline-none"
          value={letter.name}
          onChange={(e) => update((d) => void (d.name = e.target.value))}
        />
        <SaveStatus state={saveState} />
        {missing.length > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            {missing.length} unfilled placeholder{missing.length > 1 ? "s" : ""} — export
            disabled
          </span>
        )}
        <div className="flex-1" />
        <button
          type="button"
          title="Undo"
          aria-label="Undo"
          className="rounded p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          disabled={pastStates.length === 0}
          onClick={() => undo()}
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Redo"
          aria-label="Redo"
          className="rounded p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          disabled={futureStates.length === 0}
          onClick={() => redo()}
        >
          <Redo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowJd((v) => !v)}
          className={`rounded px-2 py-1 text-sm ${
            showJd ? "bg-slate-200 text-slate-800" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Job ad
        </button>
        <a
          href={`/print/letter/${letter.id}`}
          target="_blank"
          className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          Print view
        </a>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || missing.length > 0}
          className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <FileDown className="h-4 w-4" />
          {exporting ? "Exporting…" : "Export PDF"}
        </button>
      </header>

      {exportResult && (
        <div
          className={`flex items-center gap-3 border-b px-4 py-1.5 text-xs ${
            exportResult.ok
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {exportResult.ok ? (
            <>
              <span className="font-medium">Exported {exportResult.fileName}</span>
              {isMacOS && (
                <button
                  type="button"
                  onClick={() =>
                    fetch("/api/reveal", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ path: exportResult.filePath }),
                    })
                  }
                  className="rounded border border-green-300 px-2 py-0.5 hover:bg-green-100"
                >
                  Reveal in Finder
                </button>
              )}
            </>
          ) : (
            <span>Export failed: {exportResult.error}</span>
          )}
          <div className="flex-1" />
          <button
            type="button"
            title="Dismiss"
            aria-label="Dismiss"
            onClick={() => setExportResult(null)}
            className="rounded p-0.5 hover:bg-black/5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="w-[24rem] shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3">
            <Card title="Application">
              <div className="grid grid-cols-2 gap-2">
                <TextInput
                  label="Company"
                  value={letter.company}
                  onChange={(v) => update((d) => void (d.company = v))}
                />
                <TextInput
                  label="Role"
                  value={letter.role}
                  onChange={(v) => update((d) => void (d.role = v))}
                />
              </div>
              <TextInput
                label="Job ad URL"
                value={letter.job.url ?? ""}
                onChange={(v) => update((d) => void (d.job.url = v || undefined))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Select
                  label="Status"
                  value={letter.status}
                  onChange={(v) => update((d) => void (d.status = v as LetterStatus))}
                  options={STATUS_OPTIONS}
                />
                <label className="flex items-end gap-1.5 pb-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={letter.isBase}
                    onChange={(e) =>
                      update((d) => void (d.isBase = e.target.checked))
                    }
                  />
                  Use as base letter
                </label>
              </div>
            </Card>

            <Card title="Styling">
              <Select
                label="Linked resume (fonts, colors, header)"
                value={letter.resumeId ?? ""}
                onChange={relink}
                options={[
                  ...(letter.resumeId === null
                    ? [{ value: "", label: "— unlinked (frozen styling) —" }]
                    : []),
                  ...resumes.map((r) => ({ value: r.id, label: r.name })),
                ]}
              />
              {letter.resumeId === null && (
                <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                  The linked resume was deleted — styling is frozen from a
                  snapshot. Pick a resume above to re-link.
                </p>
              )}
              <Select
                label="Header style"
                value={letter.headerStyle}
                onChange={(v) =>
                  update((d) => void (d.headerStyle = v as Letter["headerStyle"]))
                }
                options={[
                  { value: "banner", label: "Full banner (like the resume)" },
                  { value: "compact", label: "Compact (no photo)" },
                  { value: "compact-photo", label: "Compact with photo" },
                ]}
              />
            </Card>

            <Card title="Letter">
              <div className="grid grid-cols-2 gap-2">
                <TextInput
                  label="Date line"
                  placeholder="Stockholm, Aug 2026"
                  value={letter.date ?? ""}
                  onChange={(v) => update((d) => void (d.date = v || undefined))}
                />
                <TextInput
                  label="Heading"
                  value={letter.heading}
                  onChange={(v) => update((d) => void (d.heading = v))}
                />
              </div>
              <TextArea
                label="Recipient"
                rows={2}
                placeholder={"Hiring team\n{{company}}"}
                value={letter.recipient ?? ""}
                onChange={(v) => update((d) => void (d.recipient = v || undefined))}
              />
              <TextArea
                label="Body"
                rows={18}
                hint="Blank line = new paragraph · {{company}} and {{role}} are filled from the application fields."
                value={letter.body}
                onChange={(v) => update((d) => void (d.body = v))}
              />
            </Card>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto py-8">
          <LetterDocument letter={letter} resume={linkedResume} chrome="screen" />
        </main>

        {showJd && (
          <aside className="w-96 shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Job description
              </span>
              <button
                type="button"
                onClick={() => setEditJd((v) => !v)}
                className="rounded px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
              >
                {editJd ? "Done" : letter.job.description ? "Edit" : "Paste"}
              </button>
            </div>
            {letter.job.url && (
              <a
                href={letter.job.url}
                target="_blank"
                className="mb-2 block truncate text-xs text-blue-600 hover:underline"
              >
                {letter.job.url}
              </a>
            )}
            {editJd ? (
              <textarea
                className="h-[70vh] w-full resize-none rounded border border-slate-300 p-2 text-xs leading-relaxed focus:border-blue-400 focus:outline-none"
                value={letter.job.description}
                placeholder="Paste the job ad here for reference while writing…"
                onChange={(e) =>
                  update((d) => void (d.job.description = e.target.value))
                }
              />
            ) : letter.job.description ? (
              <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                {letter.job.description}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                No job description stored yet — click Paste to add it. It stays
                with this letter for future reference.
              </p>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
