// {{company}} / {{role}} placeholder handling for letters. Substitution
// happens inside the block factory — upstream of both the measurement pass
// and the page render — so placeholder text can never cause a height
// mismatch between the two.

import type { ReactNode } from "react";
import type { Letter } from "@/lib/schema";

const PLACEHOLDER_RE = /\{\{\s*(\w+)\s*\}\}/g;

export function placeholderValues(letter: Letter): Record<string, string> {
  return { company: letter.company, role: letter.role };
}

export type Segment =
  | { type: "text"; text: string }
  | { type: "filled"; text: string; key: string }
  | { type: "missing"; text: string; key: string };

export function tokenize(
  text: string,
  values: Record<string, string>
): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(PLACEHOLDER_RE)) {
    if (match.index! > last) {
      segments.push({ type: "text", text: text.slice(last, match.index) });
    }
    const key = match[1];
    const value = values[key];
    segments.push(
      value
        ? { type: "filled", text: value, key }
        : { type: "missing", text: match[0], key }
    );
    last = match.index! + match[0].length;
  }
  if (last < text.length) segments.push({ type: "text", text: text.slice(last) });
  return segments;
}

// Placeholder keys that are unknown or have empty values, across all
// placeholder-bearing fields. Non-empty result blocks export.
export function findMissing(letter: Letter): string[] {
  const values = placeholderValues(letter);
  const missing = new Set<string>();
  for (const text of [letter.heading, letter.body, letter.recipient ?? ""]) {
    for (const segment of tokenize(text, values)) {
      if (segment.type === "missing") missing.add(segment.key);
    }
  }
  return [...missing];
}

// Renders text with placeholders substituted; missing ones get a visible
// highlight (background/underline only — no metric-affecting styles, so
// measure and render stay identical). Single \n renders as a line break.
export function PlaceholderText({
  text,
  values,
}: {
  text: string;
  values: Record<string, string>;
}) {
  const nodes: ReactNode[] = [];
  const lines = text.split("\n");
  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) nodes.push(<br key={`br${lineIdx}`} />);
    tokenize(line, values).forEach((segment, i) => {
      if (segment.type === "missing") {
        nodes.push(
          <mark
            key={`${lineIdx}-${i}`}
            className="lt-ph-missing"
            title={`Unfilled placeholder — set "${segment.key}" in the letter metadata`}
          >
            {segment.text}
          </mark>
        );
      } else {
        nodes.push(segment.text);
      }
    });
  });
  return <>{nodes}</>;
}
