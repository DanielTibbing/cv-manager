const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// "2021-03" → "Mar 2021"; anything else passes through untouched.
export function formatDate(value: string | undefined): string {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${month} ${match[1]}` : value;
}

export function formatRange(
  start: string | undefined,
  end: string | undefined,
  current: boolean | undefined
): string {
  const from = formatDate(start);
  const to = current ? "Present" : formatDate(end);
  if (from && to) return `${from} – ${to}`;
  return from || to || "";
}
