/** Must match `DEFAULT_CALENDAR_TIMEZONE` / booking APIs (IST). */
export const SCHEDULE_BOOKING_TIMEZONE = "Asia/Kolkata";

export function todayYmdInScheduleTz(now: Date = new Date()): { year: number; monthIndex: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHEDULE_BOOKING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    const fallback = new Date();
    return { year: fallback.getFullYear(), monthIndex: fallback.getMonth(), day: fallback.getDate() };
  }
  return { year: y, monthIndex: m - 1, day: d };
}
