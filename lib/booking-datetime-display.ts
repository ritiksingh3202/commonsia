/**
 * Fixed locale + options so server render and browser hydration always match.
 * (Avoid `toLocaleString(undefined, …)` — Node vs browser default locale differs.)
 */
const DISPLAY_LOCALE = "en-US";

export function formatBookingRangeDisplay(startISO: string, endISO: string): string {
  const s = new Date(startISO);
  const e = new Date(endISO);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "";
  const datePart = s.toLocaleDateString(DISPLAY_LOCALE, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeOpts = { hour: "numeric" as const, minute: "2-digit" as const, hour12: true };
  const t0 = s.toLocaleTimeString(DISPLAY_LOCALE, timeOpts);
  const t1 = e.toLocaleTimeString(DISPLAY_LOCALE, timeOpts);
  return `${datePart} · ${t0} – ${t1}`;
}

/** Short line for dashboard lists (stable across SSR/client). */
export function formatSessionStartDisplay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(DISPLAY_LOCALE, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
