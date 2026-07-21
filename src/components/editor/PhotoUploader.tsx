"use client";

import { useRef, useState } from "react";
import { useResumeStore } from "@/store/resumeStore";
import { Field, Select, SmallButton } from "./forms/fields";

export function PhotoUploader() {
  const photo = useResumeStore((s) => s.resume?.profile.photo);
  const update = useResumeStore((s) => s.update);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Upload failed");
      update((d) => {
        d.profile.photo = {
          file: body.file,
          shape: d.profile.photo?.shape ?? "circle",
          sizeMm: d.profile.photo?.sizeMm ?? 26,
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- local API-served preview thumbnail
          <img
            src={`/api/uploads/${photo.file}`}
            alt="Profile photo"
            className={`h-14 w-14 border border-slate-200 object-cover ${
              photo.shape === "circle"
                ? "rounded-full"
                : photo.shape === "rounded"
                  ? "rounded-md"
                  : ""
            }`}
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400">
            none
          </div>
        )}
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : photo ? "Replace photo" : "Upload photo"}
          </button>
          {photo && (
            <SmallButton
              danger
              onClick={() => update((d) => void (d.profile.photo = undefined))}
            >
              Remove
            </SmallButton>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {photo && (
        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Shape"
            value={photo.shape}
            onChange={(v) =>
              update(
                (d) =>
                  void (d.profile.photo!.shape = v as "circle" | "rounded" | "square")
              )
            }
            options={[
              { value: "circle", label: "Circle" },
              { value: "rounded", label: "Rounded" },
              { value: "square", label: "Square" },
            ]}
          />
          <Field label={`Size (${photo.sizeMm} mm)`}>
            <input
              type="range"
              min={14}
              max={50}
              step={1}
              value={photo.sizeMm}
              className="w-full"
              onChange={(e) =>
                update(
                  (d) => void (d.profile.photo!.sizeMm = Number(e.target.value))
                )
              }
            />
          </Field>
        </div>
      )}
    </div>
  );
}
