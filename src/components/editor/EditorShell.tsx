"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import type { Resume, SectionKind } from "@/lib/schema";
import { useResumeStore } from "@/store/resumeStore";
import { ResumeDocument } from "@/components/resume/ResumeDocument";
import { SortableColumns, type DragHandleProps } from "./dnd/SortableColumns";
import { useDocumentAutosave } from "./useDocumentAutosave";
import { ProfileForm } from "./forms/ProfileForm";
import { SectionForm } from "./forms/SectionForm";
import { LayoutControls } from "./LayoutControls";
import { TemplatePicker } from "./inspector/TemplatePicker";
import { ThemeInspector } from "./inspector/ThemeInspector";

const KIND_LABEL: Record<SectionKind, string> = {
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  custom: "Custom",
};

// Debounced autosave with stale-tab conflict detection — shared hook, wired
// to the resume store.
function useAutosave() {
  useDocumentAutosave({
    subscribeDoc: (listener) =>
      useResumeStore.subscribe((state, prev) =>
        listener(state.resume, prev.resume)
      ),
    getDoc: () => useResumeStore.getState().resume,
    endpoint: (id) => `/api/resumes/${id}`,
    getBaseUpdatedAt: () =>
      useResumeStore.getState().serverUpdatedAt ?? undefined,
    setSaveState: (s) => useResumeStore.getState().setSaveState(s),
    onSaved: (saved) => useResumeStore.getState().ackSave(saved.updatedAt),
  });
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      className={`text-xs text-slate-400 transition-transform ${open ? "rotate-90" : ""}`}
      aria-hidden
    >
      ▶
    </span>
  );
}

function ProfileCard({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const fullName = useResumeStore((s) => s.resume?.profile.fullName);
  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <Chevron open={expanded} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-slate-800">
            {fullName || "Profile"}
          </div>
          <div className="text-xs text-slate-400">Profile, photo & contacts</div>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-slate-200 p-3">
          <ProfileForm />
        </div>
      )}
    </div>
  );
}

function SectionCard({
  sectionId,
  handleProps,
  expanded,
  onToggle,
}: {
  sectionId: string;
  handleProps: DragHandleProps;
  expanded: boolean;
  onToggle: () => void;
}) {
  const section = useResumeStore((s) =>
    s.resume?.sections.find((sec) => sec.id === sectionId)
  );
  const toggleVisible = useResumeStore((s) => s.toggleSectionVisible);
  const removeSection = useResumeStore((s) => s.removeSection);
  if (!section) return null;

  return (
    <div
      className={`rounded-md border border-slate-200 bg-white shadow-sm ${
        section.visible ? "" : "opacity-60"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <span
          className="text-slate-300"
          title="Drag to reorder"
          {...handleProps}
        >
          ⠿
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <Chevron open={expanded} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-slate-800">
              {section.title}
            </span>
            <span className="block text-xs text-slate-400">
              {KIND_LABEL[section.kind]}
            </span>
          </span>
        </button>
        <button
          type="button"
          title={section.visible ? "Hide section" : "Show section"}
          className="rounded px-1.5 py-0.5 text-sm text-slate-500 hover:bg-slate-100"
          onClick={() => toggleVisible(sectionId)}
        >
          {section.visible ? "👁" : "🚫"}
        </button>
        <button
          type="button"
          title="Delete section"
          className="rounded px-1.5 py-0.5 text-sm text-red-400 hover:bg-red-50"
          onClick={() => {
            if (window.confirm(`Delete section "${section.title}" and its content?`)) {
              removeSection(sectionId);
            }
          }}
        >
          ✕
        </button>
      </div>
      {expanded && <SectionForm section={section} />}
    </div>
  );
}

function ThemeCard({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const overrideCount = useResumeStore(
    (s) => Object.keys(s.resume?.themeOverrides ?? {}).length
  );
  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <Chevron open={expanded} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-800">Theme</div>
          <div className="text-xs text-slate-400">
            Fonts, colors, margins
            {overrideCount > 0 && ` · ${overrideCount} override${overrideCount > 1 ? "s" : ""}`}
          </div>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-slate-200 p-3">
          <ThemeInspector />
        </div>
      )}
    </div>
  );
}

function AddSectionRow() {
  const addSection = useResumeStore((s) => s.addSection);
  return (
    <div className="mt-3">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
        Add section
      </span>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(KIND_LABEL) as SectionKind[]).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => addSection(kind)}
            className="rounded border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600"
          >
            + {KIND_LABEL[kind]}
          </button>
        ))}
      </div>
    </div>
  );
}

const SAVE_LABEL: Record<string, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Save failed — retrying on next change",
  conflict: "⚠ Edited elsewhere — reload this tab to continue",
};

export function EditorShell({ initial }: { initial: Resume }) {
  const resume = useResumeStore((s) => s.resume);
  const saveState = useResumeStore((s) => s.saveState);
  const load = useResumeStore((s) => s.load);
  const update = useResumeStore((s) => s.update);
  const moveSection = useResumeStore((s) => s.moveSection);
  const { undo, redo, pastStates, futureStates, clear } = useStore(
    useResumeStore.temporal
  );

  const [expanded, setExpanded] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<
    | { ok: true; fileName: string; filePath: string }
    | { ok: false; error: string }
    | null
  >(null);

  useAutosave();
  useEffect(() => {
    load(initial);
    clear(); // the initial load is not an undoable edit
  }, [initial, load, clear]);

  if (!resume) return null;

  const handleExport = async () => {
    setExporting(true);
    setExportResult(null);
    try {
      const res = await fetch(`/api/export/${resume.id}`, { method: "POST" });
      const body = await res.json();
      setExportResult(
        res.ok
          ? { ok: true, fileName: body.fileName, filePath: body.filePath }
          : { ok: false, error: body.error }
      );
    } catch (err) {
      setExportResult({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setExporting(false);
    }
  };

  const toggle = (id: string) => setExpanded((cur) => (cur === id ? null : id));

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
          ← Resumes
        </Link>
        <input
          className="w-64 rounded border border-transparent px-2 py-1 text-sm font-semibold hover:border-slate-200 focus:border-slate-300 focus:outline-none"
          value={resume.name}
          onChange={(e) => update((d) => void (d.name = e.target.value))}
        />
        <span className="text-xs text-slate-400">{SAVE_LABEL[saveState]}</span>
        <div className="flex-1" />
        <button
          type="button"
          className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          disabled={pastStates.length === 0}
          onClick={() => undo()}
        >
          ↩ Undo
        </button>
        <button
          type="button"
          className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          disabled={futureStates.length === 0}
          onClick={() => redo()}
        >
          ↪ Redo
        </button>
        <a
          href={`/print/${resume.id}`}
          target="_blank"
          className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          Print view
        </a>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
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
              <span className="font-medium">
                Exported {exportResult.fileName}
              </span>
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
            </>
          ) : (
            <span>Export failed: {exportResult.error}</span>
          )}
          <div className="flex-1" />
          <button
            type="button"
            title="Dismiss"
            onClick={() => setExportResult(null)}
            className="rounded px-1.5 hover:bg-black/5"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="w-[26rem] shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex flex-col gap-3">
            <ProfileCard
              expanded={expanded === "__profile"}
              onToggle={() => toggle("__profile")}
            />
            <TemplatePicker />
            <LayoutControls />
            <ThemeCard
              expanded={expanded === "__theme"}
              onToggle={() => toggle("__theme")}
            />
          </div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sections — drag ⠿ to reorder
          </h2>
          {resume.sections.length === 0 && (
            <p className="mb-2 rounded border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-400">
              No sections yet — add one below to start building your resume.
            </p>
          )}
          <SortableColumns
            columns={resume.layout.columns}
            mode={resume.layout.mode}
            renderItem={(id, handleProps) => (
              <SectionCard
                sectionId={id}
                handleProps={handleProps}
                expanded={expanded === id}
                onToggle={() => toggle(id)}
              />
            )}
            onMove={moveSection}
          />
          <AddSectionRow />
        </aside>

        <main className="min-w-0 flex-1 overflow-auto py-8">
          <ResumeDocument
            resume={resume}
            chrome="screen"
            onSideWidthChange={(percent) =>
              update((d) => void (d.layout.sideColumnWidthPercent = percent))
            }
          />
        </main>
      </div>
    </div>
  );
}
