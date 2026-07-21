import type { ProjectItem } from "@/lib/schema";

// One project entry — an atomic pagination block.
export function ProjectItemBlock({ item }: { item: ProjectItem }) {
  const bullets = item.bullets.filter((b) => b.trim());
  return (
    <div className="rs-item" data-item-id={item.id}>
      <div className="rs-item-head">
        <div className="rs-item-title">{item.name}</div>
        {item.url && <div className="rs-item-meta">{item.url}</div>}
      </div>
      {item.description && <p className="rs-item-summary">{item.description}</p>}
      {bullets.length > 0 && (
        <ul className="rs-bullets">
          {bullets.map((bullet, i) => (
            <li key={i}>{bullet}</li>
          ))}
        </ul>
      )}
      {item.tech.length > 0 && (
        <div className="rs-tags">
          {item.tech.map((t) => (
            <span className="rs-tag" key={t}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
