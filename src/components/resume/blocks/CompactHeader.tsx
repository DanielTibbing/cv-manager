import type { Profile } from "@/lib/schema";

// Lighter identity block for letters: name + headline + one contact line,
// no photo. Inherits all typography/color tokens, so it still visually pairs
// with the linked resume.
export function CompactHeader({ profile }: { profile: Profile }) {
  return (
    <header className="lt-compact-header">
      <div className="lt-compact-name">{profile.fullName}</div>
      {profile.headline && (
        <span className="lt-compact-headline">{profile.headline}</span>
      )}
      {profile.contacts.length > 0 && (
        <div className="rs-contacts">
          {profile.contacts.map((c) => (
            <span key={c.id}>
              {c.label ? `${c.label}: ` : ""}
              {c.value}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
