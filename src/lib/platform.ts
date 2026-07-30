// Client-side platform sniff for UI that only makes sense on one OS
// (e.g. "Reveal in Finder" — /api/reveal is macOS-only by design).
export const isMacOS =
  typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");
