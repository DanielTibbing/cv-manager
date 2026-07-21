"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ResumeIndex } from "@/lib/schema";

export default function ManagerPage() {
  const [index, setIndex] = useState<ResumeIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    const name = window.prompt("Name for the new resume:", "New resume");
    if (!name) return;
    await fetch("/api/resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
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

  const rename = async (id: string, currentName: string) => {
    const name = window.prompt("New name:", currentName);
    if (!name || name === currentName) return;
    const resume = await (await fetch(`/api/resumes/${id}`)).json();
    await fetch(`/api/resumes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...resume, name }),
    });
    refresh();
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CV Manager</h1>
          <p className="text-sm text-slate-500">
            Local-first resume builder · data lives in <code>data/</code>, PDFs in{" "}
            <code>exports/</code>
          </p>
        </div>
        <button
          type="button"
          onClick={createResume}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New resume
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!index && !error && <p className="text-sm text-slate-400">Loading…</p>}

      {index && index.resumes.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-400">
          No resumes yet — click “New resume” to create your first one.
        </div>
      )}

      {index && (
        <ul className="flex flex-col gap-3">
          {index.resumes.map((resume) => {
            const isActive = resume.id === index.activeResumeId;
            return (
              <li
                key={resume.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="min-w-0 flex-1">
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
                  <div className="text-xs text-slate-400">
                    {resume.templateId} · updated{" "}
                    {new Date(resume.updatedAt).toLocaleString()}
                  </div>
                </div>
                {!isActive && (
                  <button
                    type="button"
                    onClick={() => setActive(resume.id)}
                    className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                  >
                    Set active
                  </button>
                )}
                <Link
                  href={`/editor/${resume.id}`}
                  className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => rename(resume.id, resume.name)}
                  className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => duplicate(resume.id)}
                  className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => remove(resume.id, resume.name)}
                  className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
