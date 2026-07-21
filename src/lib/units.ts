// Chromium maps CSS units exactly: 1mm = 96/25.4 px, 1pt = 96/72 px.
// The pagination engine (Phase 3) and all resume dimensions rely on this.

export const A4 = { widthMm: 210, heightMm: 297 } as const;

export function mmToPx(mm: number): number {
  return (mm * 96) / 25.4;
}

export function ptToPx(pt: number): number {
  return (pt * 96) / 72;
}

// CSS value helpers — return undefined when the override is unset so the
// custom property falls through to the template token.
export function mm(v: number | undefined): string | undefined {
  return v == null ? undefined : `${v}mm`;
}

export function pt(v: number | undefined): string | undefined {
  return v == null ? undefined : `${v}pt`;
}
