const TZ = process.env.DEFAULT_CALENDAR_TIMEZONE ?? "Asia/Kolkata";
const IST_OFFSET = "+05:30";

/** Parse labels like "06:30 PM" (from MENTOR_TIME_SLOTS_HALF). */
export function parseHalfHourLabelTo24h(label: string): { h: number; m: number } {
  const m = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) throw new Error(`Invalid time label: ${label}`);
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return { h, m: min };
}

/**
 * Build RFC3339 instants for a calendar day in IST, then return ISO strings for the Calendar API
 * (same pattern as /api/calendar/sync: dateTime + timeZone).
 */
export function istSlotRangeToISO(
  year: number,
  monthIndex: number,
  day: number,
  startLabel: string,
  durationMinutes: number,
): { startISO: string; endISO: string } {
  const { h, m } = parseHalfHourLabelTo24h(startLabel);
  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const hh = String(h).padStart(2, "0");
  const minS = String(m).padStart(2, "0");
  const start = new Date(`${year}-${mm}-${dd}T${hh}:${minS}:00${IST_OFFSET}`);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid start datetime");
  }
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export function defaultCalendarTimeZone(): string {
  return TZ;
}
