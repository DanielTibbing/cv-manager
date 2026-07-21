import type { CSSProperties } from "react";
import type { Profile } from "@/lib/schema";

export function ProfileHeader({ profile }: { profile: Profile }) {
  const photo = profile.photo;
  return (
    <header className="rs-header">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- exact mm sizing; next/image optimization is irrelevant for print
        <img
          className={`rs-photo rs-photo--${photo.shape}`}
          style={{ "--rs-photo-size": `${photo.sizeMm}mm` } as CSSProperties}
          src={`/api/uploads/${photo.file}`}
          alt=""
        />
      )}
      <div>
        <div className="rs-name">{profile.fullName}</div>
        {profile.headline && <div className="rs-headline">{profile.headline}</div>}
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
        {profile.summary && <p className="rs-summary">{profile.summary}</p>}
      </div>
    </header>
  );
}
