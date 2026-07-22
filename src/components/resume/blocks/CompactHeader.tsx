import type { CSSProperties } from "react";
import type { Profile } from "@/lib/schema";

// Lighter identity block for letters: name + headline + one contact line,
// optionally with a small photo. Inherits all typography/color tokens, so it
// still visually pairs with the linked resume.
export function CompactHeader({
  profile,
  showPhoto = false,
}: {
  profile: Profile;
  showPhoto?: boolean;
}) {
  const photo = showPhoto ? profile.photo : undefined;
  return (
    <header className="lt-compact-header">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- exact mm sizing; next/image optimization is irrelevant for print
        <img
          className={`rs-photo rs-photo--${photo.shape}`}
          style={
            {
              // capped so the header stays compact even if the resume's
              // banner photo is large
              "--rs-photo-size": `${Math.min(photo.sizeMm, 18)}mm`,
            } as CSSProperties
          }
          src={`/api/uploads/${photo.file}`}
          alt=""
        />
      )}
      <div>
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
      </div>
    </header>
  );
}
