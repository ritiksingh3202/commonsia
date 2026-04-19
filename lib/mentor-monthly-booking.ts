import { normalizeAvailabilityWindowKind } from "@/components/mentor/mentor-setup-constants";
import { mergeAvailabilityForSlot } from "@/lib/mentor-availability-merge";
import { prisma } from "@/lib/prisma";

const TZ = process.env.DEFAULT_CALENDAR_TIMEZONE ?? "Asia/Kolkata";

export type IstCivilParts = { year: number; monthIndex0: number; day: number; weekdayJs: number };

/** IST civil Y-M-D + weekday for an absolute instant (for session booking rules). */
export function istCivilPartsFromUtcInstant(d: Date): IstCivilParts {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [y, mo, day] = s.split("-").map(Number);
  if (!y || !mo || !day) {
    return { year: 1970, monthIndex0: 0, day: 1, weekdayJs: 0 };
  }
  const weekdayJs = new Date(Date.UTC(y, mo - 1, day, 12, 0, 0)).getUTCDay();
  return { year: y, monthIndex0: mo - 1, day, weekdayJs };
}

/** @deprecated use istCivilPartsFromUtcInstant */
export function istWeekdayJsFromUtcInstant(d: Date): number {
  return istCivilPartsFromUtcInstant(d).weekdayJs;
}

/**
 * True when the mentor already has at least one session whose IST calendar date falls on
 * `weekdayJs` within that IST calendar month (used for “one Friday per month” patterns).
 */
/**
 * Keys `"mentorUserId:year-monthIndex0"` for IST months where the mentor already had a session
 * on their configured recurring weekday (used for card copy + slot APIs).
 */
export function buildMonthlyWeekdayConsumedMap(
  mentorRows: { id: string; mentorAvailabilityJson: unknown }[],
  bookings: { mentorId: string; startAt: Date }[],
): Map<string, boolean> {
  const out = new Map<string, boolean>();
  const avById = new Map(mentorRows.map((r) => [r.id, mergeAvailabilityForSlot(r.mentorAvailabilityJson)]));
  for (const b of bookings) {
    const av = avById.get(b.mentorId);
    if (!av) continue;
    if (normalizeAvailabilityWindowKind(av.availabilityWindowKind) !== "monthly") continue;
    const w = av.recurringWeekdayJs;
    if (typeof w !== "number") continue;
    const p = istCivilPartsFromUtcInstant(b.startAt);
    if (p.weekdayJs !== w) continue;
    out.set(`${b.mentorId}:${p.year}-${p.monthIndex0}`, true);
  }
  return out;
}

export async function mentorHasBookingOnWeekdayInIstMonth(
  mentorId: string,
  year: number,
  monthIndex0: number,
  weekdayJs: number,
): Promise<boolean> {
  const month = String(monthIndex0 + 1).padStart(2, "0");
  const timeMin = new Date(`${year}-${month}-01T00:00:00+05:30`);
  const timeMax = new Date(timeMin);
  timeMax.setMonth(timeMax.getMonth() + 1);

  const bookings = await prisma.mentoringBooking.findMany({
    where: { mentorId, startAt: { gte: timeMin, lt: timeMax } },
    select: { startAt: true },
  });
  for (const b of bookings) {
    if (istCivilPartsFromUtcInstant(b.startAt).weekdayJs === weekdayJs) return true;
  }
  return false;
}
