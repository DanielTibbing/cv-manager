"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Download, Plus } from "lucide-react";
import type { ResumeIndex } from "@/lib/schema";
import { formatRelativeTime } from "@/lib/relative-time";
import { LetterList } from "@/components/manager/LetterList";
import { ImportData } from "@/components/manager/ImportData";
import { InlineRename } from "@/components/manager/InlineRename";
import { RowMenu, type RowMenuItem } from "@/components/manager/RowMenu";

// One accent color per template so rows are scannable at a glance.
const TEMPLATE_BADGE: Record<string, string> = {
  modern: "bg-blue-100 text-blue-700",
  classic: "bg-amber-100 text-amber-800",
  minimalist: "bg-slate-200 text-slate-600",
  "two-column": "bg-violet-100 text-violet-700",
};

export default function ManagerPage() {
  const [index, setIndex] = useState<ResumeIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/resumes");
      setIndex(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resumes");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; state is set after the response, not synchronously
    refresh();
  }, [refresh]);

  const createResume = async () => {
    await fetch("/api/resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New resume" }),
    });
    refresh();
  };

  const duplicate = async (id: string) => {
    await fetch(`/api/resumes/${id}/duplicate`, { method: "POST" });
    refresh();
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? A backup copy is kept in data/backups.`))
      return;
    await fetch(`/api/resumes/${id}`, { method: "DELETE" });
    refresh();
  };

  const setActive = async (id: string) => {
    await fetch("/api/active", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    refresh();
  };

  const rename = async (id: string, name: string) => {
    setRenamingId(null);
    const resume = await (await fetch(`/api/resumes/${id}`)).json();
    if (name === resume.name) return;
    await fetch(`/api/resumes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...resume, name }),
    });
    refresh();
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 basis-72 grow">
          <h1 className="text-2xl font-bold">CV Manager</h1>
          <p className="text-sm text-slate-500">
            Local-first resume builder · data lives in <code>data/</code>, PDFs
            in <code>exports/</code>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href="/api/backup"
            download
            className="flex items-center gap-1.5 rounded border border-slate-300 px-4 py-2 text-sm font-medium whitespace-nowrap text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export data
          </a>
          <ImportData onImported={refresh} />
          <button
            type="button"
            onClick={createResume}
            className="flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-sm font-medium whitespace-nowrap text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New resume
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!index && !error && <p className="text-sm text-slate-400">Loading…</p>}

      {index && index.resumes.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-400">
          <p>No resumes yet — create your first one to get started.</p>
          <button
            type="button"
            onClick={createResume}
            className="mt-3 inline-flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New resume
          </button>
        </div>
      )}

      {index && (
        <ul className="flex flex-col gap-3">
          {index.resumes.map((resume) => {
            const isActive = resume.id === index.activeResumeId;
            const menuItems: RowMenuItem[] = [
              ...(!isActive
                ? [{ label: "Set active", onClick: () => setActive(resume.id) }]
                : []),
              { label: "Rename", onClick: () => setRenamingId(resume.id) },
              { label: "Duplicate", onClick: () => duplicate(resume.id) },
              {
                label: "Delete",
                danger: true,
                onClick: () => remove(resume.id, resume.name),
              },
            ];
            return (
              <li
                key={resume.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  {renamingId === resume.id ? (
                    <InlineRename
                      initial={resume.name}
                      onCommit={(name) => rename(resume.id, name)}
                      onCancel={() => setRenamingId(null)}
                    />
                  ) : (
                    <>
                      <Link
                        href={`/editor/${resume.id}`}
                        className="font-medium text-slate-800 hover:text-blue-700"
                      >
                        {resume.name}
                      </Link>
                      {isActive && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Active
                        </span>
                      )}
                    </>
                  )}
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${
                        TEMPLATE_BADGE[resume.templateId] ??
                        "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {resume.templateId}
                    </span>
                    <span title={new Date(resume.updatedAt).toLocaleString()}>
                      updated {formatRelativeTime(resume.updatedAt)}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/editor/${resume.id}`}
                  className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </Link>
                <RowMenu
                  label={`Actions for ${resume.name}`}
                  items={menuItems}
                />
              </li>
            );
          })}
        </ul>
      )}

      {index && (
        <LetterList
          resumes={index.resumes}
          activeResumeId={index.activeResumeId}
        />
      )}
    </div>
  );
}
