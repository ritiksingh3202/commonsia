/** Presets for “view times in my timezone” on the booking page (IANA ids). */
export const BOOKING_DISPLAY_TIMEZONES = [
  { id: "Asia/Kolkata", label: "India (IST)" },
  { id: "Asia/Dubai", label: "United Arab Emirates (GST)" },
  { id: "Asia/Singapore", label: "Singapore (SGT)" },
  { id: "Europe/London", label: "United Kingdom" },
  { id: "America/New_York", label: "US — Eastern" },
  { id: "America/Los_Angeles", label: "US — Pacific" },
  { id: "Australia/Sydney", label: "Australia — Sydney" },
] as const;

export type BookingDisplayTimeZoneId = (typeof BOOKING_DISPLAY_TIMEZONES)[number]["id"];

export function formatSlotInterval(startISO: string, endISO: string, timeZone: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  const fmt = new Intl.DateTimeFormat("en-GB", opts);
  return `${fmt.format(new Date(startISO))} – ${fmt.format(new Date(endISO))}`;
}

export function formatSlotIntervalWithZoneName(
  startISO: string,
  endISO: string,
  timeZone: string,
): string {
  const line = formatSlotInterval(startISO, endISO, timeZone);
  try {
    const name =
      new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "short" })
        .formatToParts(new Date(startISO))
        .find((p) => p.type === "timeZoneName")?.value ?? "";
    return name ? `${line} ${name}` : line;
  } catch {
    return line;
  }
}
