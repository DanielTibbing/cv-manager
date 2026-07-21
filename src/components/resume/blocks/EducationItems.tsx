import type { EducationItem } from "@/lib/schema";
import { formatRange } from "../format";

// One education entry — an atomic pagination block.
export function EducationItemBlock({ item }: { item: EducationItem }) {
  return (
    <div className="rs-item" data-item-id={item.id}>
      <div className="rs-item-head">
        <div className="rs-item-title">
          {item.degree}
          {item.institution && (
            <>
              {" "}
              · <span className="rs-item-sub">{item.institution}</span>
            </>
          )}
        </div>
        <div className="rs-item-meta">
          {formatRange(item.startDate, item.endDate, false)}
          {item.location && <div>{item.location}</div>}
        </div>
      </div>
      {item.details && <p className="rs-item-summary">{item.details}</p>}
    </div>
  );
}
