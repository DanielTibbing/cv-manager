"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  LetterIndexEntry,
  LetterStatus,
  ResumeIndexEntry,
} from "@/lib/schema";

const STATUS_STYLE: Record<LetterStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  interview: "bg-amber-100 text-amber-700",
  offer: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

const STATUS_LABELS: LetterStatus[] = [
  "draft",
  "sent",
  "interview",
  "offer",
  "rejected",
];

function NewLetterModal({
  letters,
  resumes,
  activeResumeId,
  onClose,
}: {
  letters: LetterIndexEntry[];
  resumes: ResumeIndexEntry[];
  activeResumeId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const bases = letters.filter((l) => l.isBase);
  const [baseId, setBaseId] = useState(bases[0]?.id ?? "");
  const [resumeId, setResumeId] = useState(activeResumeId ?? resumes[0]?.id ?? "");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);

  const inputCls =
    "w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none";

  const create = async () => {
    setBusy(true);
    const res = await fetch("/api/letters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company,
        role,
        jobDescription: jd || undefined,
        baseLetterId: baseId || undefined,
        ...(baseId ? {} : { resumeId }),
      }),
    });
    if (res.ok) {
      const letter = await res.json();
      router.push(`/editor/letter/${letter.id}`);
    } else {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-sm font-semibold text-slate-800">
          New letter for application
        </h3>
        <div className="flex flex-col gap-2.5">
          <label className="block text-xs text-slate-500">
            Start from
            <select
              className={`${inputCls} mt-0.5`}
              value={baseId}
              onChange={(e) => setBaseId(e.target.value)}
            >
              {bases.map((b) => (
                <option key={b.id} value={b.id}>
                  Base: {b.name}
                </option>
              ))}
              <option value="">Blank letter</option>
            </select>
          </label>
          {!baseId && (
            <label className="block text-xs text-slate-500">
              Styled like resume
              <select
                className={`${inputCls} mt-0.5`}
                value={resumeId}
                onChange={(e) => setResumeId(e.target.value)}
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-slate-500">
              Company
              <input
                className={`${inputCls} mt-0.5`}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Apollo"
              />
            </label>
            <label className="block text-xs text-slate-500">
              Role
              <input
                className={`${inputCls} mt-0.5`}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Engineering Manager"
              />
            </label>
          </div>
          <label className="block text-xs text-slate-500">
            Job description (stored with the letter, shown while writing)
            <textarea
              className={`${inputCls} mt-0.5 resize-y`}
              rows={5}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job ad here…"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !company}
            onClick={create}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create & open"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LetterList({
  resumes,
  activeResumeId,
}: {
  resumes: ResumeIndexEntry[];
  activeResumeId: string | null;
}) {
  const [letters, setLetters] = useState<LetterIndexEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | LetterStatus>("");
  const [showModal, setShowModal] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/letters");
    const body = await res.json();
    setLetters(body.letters);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch; state is set after the response, not synchronously
    refresh();
  }, [refresh]);

  const resumeName = (id: string | null) =>
    resumes.find((r) => r.id === id)?.name;

  const visible = useMemo(() => {
    if (!letters) return [];
    const q = query.trim().toLowerCase();
    return letters
      .filter((l) => !statusFilter || l.status === statusFilter)
      .filter(
        (l) =>
          !q ||
          `${l.name} ${l.company} ${l.role}`.toLowerCase().includes(q)
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [letters, query, statusFilter]);

  const rename = async (id: string, currentName: string) => {
    const name = window.prompt("New name:", currentName);
    if (!name || name === currentName) return;
    const letter = await (await fetch(`/api/letters/${id}`)).json();
    await fetch(`/api/letters/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...letter, name }),
    });
    refresh();
  };

  const toggleBase = async (id: string) => {
    const letter = await (await fetch(`/api/letters/${id}`)).json();
    await fetch(`/api/letters/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...letter, isBase: !letter.isBase }),
    });
    refresh();
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete letter "${name}"? A backup copy is kept in data/backups.`))
      return;
    await fetch(`/api/letters/${id}`, { method: "DELETE" });
    refresh();
  };

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Personal letters</h2>
          <p className="text-sm text-slate-500">
            One per application — styled like the resume they link to
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New letter
        </button>
      </div>

      {letters && letters.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <input
            className="w-64 rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
            placeholder="Search company, role, name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-600 focus:border-blue-400 focus:outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | LetterStatus)}
          >
            <option value="">All statuses</option>
            {STATUS_LABELS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {letters && letters.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 px-6 py-8 text-center text-sm text-slate-400">
          No letters yet — create one, write your generic pitch with{" "}
          <code>{"{{company}}"}</code> placeholders, and mark it as a base to
          reuse for every application.
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {visible.map((letter) => (
          <li
            key={letter.id}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <Link
                href={`/editor/letter/${letter.id}`}
                className="font-medium text-slate-800 hover:text-blue-700"
              >
                {letter.name}
              </Link>
              {letter.isBase && (
                <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                  Base
                </span>
              )}
              <div className="text-xs text-slate-400">
                {[letter.company, letter.role].filter(Boolean).join(" · ") || "—"}
                {" · "}
                {resumeName(letter.resumeId) ?? "unlinked"}
                {" · "}
                {new Date(letter.updatedAt).toLocaleDateString()}
              </div>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[letter.status]}`}
            >
              {letter.status}
            </span>
            <Link
              href={`/editor/letter/${letter.id}`}
              className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => rename(letter.id, letter.name)}
              className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() => toggleBase(letter.id)}
              className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              {letter.isBase ? "Unmark base" : "Mark base"}
            </button>
            <button
              type="button"
              onClick={() => remove(letter.id, letter.name)}
              className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {showModal && letters && (
        <NewLetterModal
          letters={letters}
          resumes={resumes}
          activeResumeId={activeResumeId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
