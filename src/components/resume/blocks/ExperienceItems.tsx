import type { ExperienceItem } from "@/lib/schema";
import { formatRange } from "../format";

// One experience entry — an atomic pagination block (never splits across pages).
export function ExperienceItemBlock({ item }: { item: ExperienceItem }) {
  const bullets = item.bullets.filter((b) => b.trim());
  const subPositions = (item.subPositions ?? []).filter((sp) => sp.visible);
  return (
    <div className="rs-item" data-item-id={item.id}>
      <div className="rs-item-head">
        <div className="rs-item-title">
          {item.role}
          {item.company && (
            <>
              {" "}
              · <span className="rs-item-sub">{item.company}</span>
            </>
          )}
        </div>
        <div className="rs-item-meta">
          {formatRange(item.startDate, item.endDate, item.current)}
          {item.location && <div>{item.location}</div>}
        </div>
      </div>
      {item.summary && <p className="rs-item-summary">{item.summary}</p>}
      {bullets.length > 0 && (
        <ul className="rs-bullets">
          {bullets.map((bullet, i) => (
            <li key={i}>{bullet}</li>
          ))}
        </ul>
      )}
      {subPositions.length > 0 && (
        <div className="rs-subpositions">
          <div className="rs-subpositions-label">
            {item.subPositionsLabel || "Consultant positions"}
          </div>
          <ul className="rs-bullets">
            {subPositions.map((sp) => (
              <li key={sp.id}>
                <span className="rs-subposition">
                  <span>
                    {sp.role}
                    {sp.client && (
                      <>
                        {" "}
                        at <span className="rs-item-sub">{sp.client}</span>
                      </>
                    )}
                  </span>
                  <span className="rs-item-meta">
                    {formatRange(sp.startDate, sp.endDate, false)}
                    {sp.location &&
                      `${sp.startDate || sp.endDate ? " · " : ""}${sp.location}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
