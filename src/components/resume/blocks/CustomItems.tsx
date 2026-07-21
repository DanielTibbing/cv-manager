import type { CustomItem } from "@/lib/schema";

// Body is plain text: consecutive "- " lines become a bullet list, other
// lines become paragraphs.
function renderBody(body: string) {
  const lines = body.split("\n");
  const nodes: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    nodes.push(
      <ul className="rs-bullets" key={`ul-${nodes.length}`}>
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    );
    bullets = [];
  };

  for (const line of lines) {
    if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
    } else {
      flushBullets();
      if (line.trim()) {
        nodes.push(
          <p className="rs-item-summary" key={`p-${nodes.length}`}>
            {line}
          </p>
        );
      }
    }
  }
  flushBullets();
  return nodes;
}

// One custom entry — an atomic pagination block.
export function CustomItemBlock({ item }: { item: CustomItem }) {
  return (
    <div className="rs-item" data-item-id={item.id}>
      {(item.heading || item.sub) && (
        <div className="rs-item-head">
          {item.heading && <div className="rs-item-title">{item.heading}</div>}
          {item.sub && <div className="rs-item-meta">{item.sub}</div>}
        </div>
      )}
      {renderBody(item.body)}
    </div>
  );
}
