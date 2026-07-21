"use client";

import type { Contact } from "@/lib/schema";
import { newContact } from "@/lib/defaults";
import { useResumeStore } from "@/store/resumeStore";
import { PhotoUploader } from "../PhotoUploader";
import { AddButton, Select, SmallButton, TextArea, TextInput } from "./fields";

const CONTACT_KINDS: { value: Contact["kind"]; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "location", label: "Location" },
  { value: "website", label: "Website" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "github", label: "GitHub" },
  { value: "custom", label: "Custom" },
];

export function ProfileForm() {
  const profile = useResumeStore((s) => s.resume?.profile);
  const update = useResumeStore((s) => s.update);
  if (!profile) return null;

  return (
    <div className="flex flex-col gap-3">
      <PhotoUploader />
      <div className="grid grid-cols-2 gap-2">
        <TextInput
          label="Full name"
          value={profile.fullName}
          onChange={(v) => update((d) => void (d.profile.fullName = v))}
        />
        <TextInput
          label="Headline"
          placeholder="Senior Software Engineer"
          value={profile.headline}
          onChange={(v) => update((d) => void (d.profile.headline = v))}
        />
      </div>
      <TextArea
        label="Summary"
        rows={3}
        value={profile.summary ?? ""}
        onChange={(v) => update((d) => void (d.profile.summary = v || undefined))}
      />
      <div>
        <span className="mb-1 block text-xs font-medium text-slate-500">
          Contacts
        </span>
        <div className="flex flex-col gap-1.5">
          {profile.contacts.map((contact, i) => (
            <div key={contact.id} className="flex items-end gap-1.5">
              <Select
                label=""
                className="w-28 shrink-0"
                value={contact.kind}
                onChange={(v) =>
                  update(
                    (d) =>
                      void (d.profile.contacts[i].kind = v as Contact["kind"])
                  )
                }
                options={CONTACT_KINDS}
              />
              {contact.kind === "custom" && (
                <TextInput
                  label=""
                  className="w-24 shrink-0"
                  placeholder="Label"
                  value={contact.label ?? ""}
                  onChange={(v) =>
                    update(
                      (d) => void (d.profile.contacts[i].label = v || undefined)
                    )
                  }
                />
              )}
              <TextInput
                label=""
                placeholder="Value"
                value={contact.value}
                onChange={(v) => update((d) => void (d.profile.contacts[i].value = v))}
              />
              <SmallButton
                danger
                title="Remove contact"
                onClick={() => update((d) => void d.profile.contacts.splice(i, 1))}
              >
                ✕
              </SmallButton>
            </div>
          ))}
        </div>
        <AddButton onClick={() => update((d) => void d.profile.contacts.push(newContact()))}>
          + Add contact
        </AddButton>
      </div>
    </div>
  );
}
