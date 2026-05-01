/** Human-readable IST (or DEFAULT_CALENDAR_TIMEZONE) strings for WhatsApp templates. */

export function formatBookingWhatsAppRange(start: Date, end: Date): string {
  const tz = process.env.DEFAULT_CALENDAR_TIMEZONE ?? "Asia/Kolkata";
  const durationMin = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 60_000),
  );
  const dateFmt = new Intl.DateTimeFormat("en-IN", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat("en-IN", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const datePart = dateFmt.format(start);
  const t0 = timeFmt.format(start);
  const t1 = timeFmt.format(end);
  return `${datePart}, ${t0} – ${t1} (${durationMin}-min session window)`;
}

export function formatBookingWhatsAppDateOnly(d: Date): string {
  const tz = process.env.DEFAULT_CALENDAR_TIMEZONE ?? "Asia/Kolkata";
  const df = new Intl.DateTimeFormat("en-IN", { timeZone: tz, dateStyle: "medium" });
  return df.format(d);
}

export function formatBookingWhatsAppTimeShort(d: Date): string {
  const tz = process.env.DEFAULT_CALENDAR_TIMEZONE ?? "Asia/Kolkata";
  const df = new Intl.DateTimeFormat("en-IN", { timeZone: tz, timeStyle: "short" });
  return df.format(d);
}
