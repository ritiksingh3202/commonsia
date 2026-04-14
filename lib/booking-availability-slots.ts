import {
  MENTOR_TIME_SLOTS_HALF,
  type MentorAvailabilityJson,
  type WeekdayKey,
} from "@/components/mentor/mentor-setup-constants";
import { slotLabelToMinutes, sortSlotLabels } from "@/lib/mentor-availability-slots";
import { mergeAvailabilityForSlot } from "@/lib/mentor-next-slot";
import { istSlotRangeToISO } from "@/lib/schedule-slot-ist";

const TZ = process.env.DEFAULT_CALENDAR_TIMEZONE ?? "Asia/Kolkata";

const SLOT_INDEX = new Map<string, number>(MENTOR_TIME_SLOTS_HALF.map((lab, i) => [lab, i]));

export function calendarDateToIso(year: number, monthIndex: number, day: number): string {
  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** Weekday for a civil calendar date (same worldwide). */
export function weekdayKeyForCalendarDate(year: number, monthIndex: number, day: number): WeekdayKey {
  const wd = new Date(Date.UTC(year, monthIndex, day, 12, 0, 0)).getUTCDay();
  const map: WeekdayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[wd] ?? "mon";
}

export function todayIsoInBookingTz(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function daysFromTodayTo(targetIso: string, todayIso: string): number {
  const a = new Date(`${todayIso}T12:00:00.000Z`).getTime();
  const b = new Date(`${targetIso}T12:00:00.000Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function isBlocked(iso: string, av: MentorAvailabilityJson): boolean {
  return (av.blockedDates ?? []).some((b) => b.date === iso);
}

function labelAtMinutes(mins: number): string | null {
  for (const lab of MENTOR_TIME_SLOTS_HALF) {
    if (slotLabelToMinutes(lab) === mins) return lab;
  }
  return null;
}

/** Each 30-minute block that must be within mentor availability for this duration. */
export function requiredHalfHourStartsForDuration(
  startLabel: string,
  durationMinutes: number,
): string[] | null {
  const startM = slotLabelToMinutes(startLabel);
  if (startM === null) return null;
  const out: string[] = [];
  for (let t = startM; t < startM + durationMinutes; t += 30) {
    const lab = labelAtMinutes(t);
    if (!lab) return null;
    out.push(lab);
  }
  return out;
}

/**
 * Sorted unique slot start labels (e.g. "10:00 AM") the mentor allows on this calendar date,
 * before filtering “already passed today”.
 */
export function getAllowedSlotLabelsForDate(
  av: MentorAvailabilityJson,
  year: number,
  monthIndex: number,
  day: number,
  now: Date = new Date(),
): string[] {
  const iso = calendarDateToIso(year, monthIndex, day);
  const todayIso = todayIsoInBookingTz(now);

  if (iso < todayIso) return [];
  if (isBlocked(iso, av)) return [];

  if (av.availabilityType === "specific") {
    if (!av.specificDates.includes(iso)) return [];
    return sortSlotLabels([...(av.specificDateSlots[iso] ?? [])]);
  }

  const horizon =
    av.planningHorizonDays ??
    (av.availabilityWindowKind === "fifteen_days"
      ? 15
      : av.availabilityWindowKind === "monthly"
        ? 31
        : 21);
  const maxH = Math.min(Math.max(horizon, 1), 90);
  const diff = daysFromTodayTo(iso, todayIso);
  if (diff > maxH) return [];

  const key = weekdayKeyForCalendarDate(year, monthIndex, day);
  const base = av.weeklySlots[key] ?? [];
  const extra = av.extraAvailabilitySlots?.[iso] ?? [];
  return sortSlotLabels([...new Set([...base, ...extra])]);
}

export function filterPastSlotLabels(
  labels: string[],
  year: number,
  monthIndex: number,
  day: number,
  now: Date,
): string[] {
  return labels.filter((lab) => {
    try {
      const { startISO } = istSlotRangeToISO(year, monthIndex, day, lab, 30);
      return new Date(startISO).getTime() > now.getTime();
    } catch {
      return false;
    }
  });
}

/** Display strings like "06:00 PM – 06:30 PM" (IST labels). */
export function slotRangesFromLabels(sortedLabels: string[]): string[] {
  const ranges: string[] = [];
  for (const lab of sortedLabels) {
    const i = SLOT_INDEX.get(lab);
    if (i === undefined || i + 1 >= MENTOR_TIME_SLOTS_HALF.length) continue;
    const next = MENTOR_TIME_SLOTS_HALF[i + 1];
    ranges.push(`${lab} – ${next}`);
  }
  return ranges;
}

export function getBookableSlotRangesForDate(
  raw: unknown,
  year: number,
  monthIndex: number,
  day: number,
  now: Date = new Date(),
): string[] {
  const av = mergeAvailabilityForSlot(raw);
  let labels = getAllowedSlotLabelsForDate(av, year, monthIndex, day, now);
  labels = filterPastSlotLabels(labels, year, monthIndex, day, now);
  return slotRangesFromLabels(labels);
}

export type BookableSlotSegment = {
  startLabel: string;
  startISO: string;
  endISO: string;
  /** Range label in mentor grid (IST civil date + slot labels). */
  rangeLabelIst: string;
};

/** One row per bookable 30-minute block start (used by schedule API + Google free/busy filtering). */
export function getBookableSlotSegmentsForDate(
  raw: unknown,
  year: number,
  monthIndex: number,
  day: number,
  now: Date = new Date(),
): BookableSlotSegment[] {
  const av = mergeAvailabilityForSlot(raw);
  let labels = getAllowedSlotLabelsForDate(av, year, monthIndex, day, now);
  labels = filterPastSlotLabels(labels, year, monthIndex, day, now);
  const out: BookableSlotSegment[] = [];
  for (const lab of labels) {
    const i = SLOT_INDEX.get(lab);
    if (i === undefined || i + 1 >= MENTOR_TIME_SLOTS_HALF.length) continue;
    const next = MENTOR_TIME_SLOTS_HALF[i + 1];
    try {
      const { startISO, endISO } = istSlotRangeToISO(year, monthIndex, day, lab, 30);
      out.push({
        startLabel: lab,
        startISO,
        endISO,
        rangeLabelIst: `${lab} – ${next}`,
      });
    } catch {
      /* invalid label for date */
    }
  }
  return out;
}

export function validateBookingInAvailability(
  raw: unknown,
  year: number,
  monthIndex: number,
  day: number,
  startLabel: string,
  durationMinutes: number,
  now: Date = new Date(),
): { ok: true } | { ok: false; error: string } {
  const av = mergeAvailabilityForSlot(raw);
  const allowed = new Set(getAllowedSlotLabelsForDate(av, year, monthIndex, day, now));
  const needed = requiredHalfHourStartsForDuration(startLabel, durationMinutes);
  if (!needed?.length) return { ok: false, error: "Invalid start time." };
  for (const lab of needed) {
    if (!allowed.has(lab)) {
      return { ok: false, error: "That time is not in this mentor's availability." };
    }
  }
  try {
    const { startISO } = istSlotRangeToISO(year, monthIndex, day, startLabel, durationMinutes);
    if (new Date(startISO).getTime() <= now.getTime()) {
      return { ok: false, error: "Cannot book a time in the past." };
    }
  } catch {
    return { ok: false, error: "Invalid time." };
  }
  return { ok: true };
}
