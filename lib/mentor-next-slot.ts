import {
  normalizeAvailabilityWindowKind,
  type MentorAvailabilityJson,
} from "@/components/mentor/mentor-setup-constants";
import {
  calendarDateToIso,
  filterPastSlotLabels,
  getAllowedSlotLabelsForDate,
  todayIsoInBookingTz,
} from "@/lib/booking-availability-slots";
import { sortSlotLabels } from "@/lib/mentor-availability-slots";
import { mergeAvailabilityForSlot } from "@/lib/mentor-availability-merge";

/** Re-export for callers that only imported merge from this module. */
export { mergeAvailabilityForSlot } from "@/lib/mentor-availability-merge";

/** Shown on cards when no weekly/specific slot is available in the near window. */
export const NO_UPCOMING_AVAILABILITY_LABEL = "Availability coming soon";

function isBlocked(iso: string, av: MentorAvailabilityJson): boolean {
  return (av.blockedDates ?? []).some((b) => b.date === iso);
}

function formatDateLabel(iso: string): string {
  const [y, m, day] = iso.split("-").map(Number);
  if (!y || !m || !day) return iso;
  const d = new Date(y, m - 1, day);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(d);
}

export type NextSlotMonthlyConsumedLookup = (year: number, monthIndex0: number) => boolean;

/**
 * Human-readable “next slot” line for mentor cards.
 * Pass `monthlyConsumedLookup` when the mentor uses a monthly weekday pattern so cards respect
 * “one session per month on that weekday”.
 */
export function formatNextAvailableSlotLine(
  raw: unknown,
  now = new Date(),
  monthlyConsumedLookup?: NextSlotMonthlyConsumedLookup,
): string {
  const av = mergeAvailabilityForSlot(raw);
  const todayIso = todayIsoInBookingTz(now);

  if (av.availabilityType === "specific" && av.specificDates.length > 0) {
    const kind = normalizeAvailabilityWindowKind(av.availabilityWindowKind);
    if (kind === "custom") {
      const maxScan = 180;
      const [ty, tm, td] = todayIso.split("-").map(Number);
      if (!ty || !tm || !td) return NO_UPCOMING_AVAILABILITY_LABEL;
      for (let add = 0; add < maxScan; add++) {
        const cell = new Date(ty, tm - 1, td + add, 12, 0, 0, 0);
        const y = cell.getFullYear();
        const m0 = cell.getMonth();
        const d = cell.getDate();
        const iso = calendarDateToIso(y, m0, d);
        if (iso < todayIso) continue;
        if (isBlocked(iso, av)) continue;
        const labels = getAllowedSlotLabelsForDate(av, y, m0, d, now);
        const future = filterPastSlotLabels(labels, y, m0, d, now);
        if (future.length === 0) continue;
        return `Next available: ${formatDateLabel(iso)} · ${future[0]}`;
      }
      return NO_UPCOMING_AVAILABILITY_LABEL;
    }
    const sorted = [...new Set(av.specificDates)].sort();
    for (const iso of sorted) {
      if (iso < todayIso) continue;
      const slots = av.specificDateSlots[iso] ?? [];
      if (slots.length === 0) continue;
      const labels = sortSlotLabels(slots);
      const [y, mo, d] = iso.split("-").map(Number);
      if (!y || !mo || !d) continue;
      const future = filterPastSlotLabels(labels, y, mo - 1, d, now);
      if (future.length === 0) continue;
      return `Next available: ${formatDateLabel(iso)} · ${future[0]}`;
    }
  }

  if (av.availabilityType !== "weekly") {
    return NO_UPCOMING_AVAILABILITY_LABEL;
  }

  const maxScan = 120;
  const [ty, tm, td] = todayIso.split("-").map(Number);
  if (!ty || !tm || !td) return NO_UPCOMING_AVAILABILITY_LABEL;

  for (let add = 0; add < maxScan; add++) {
    const cell = new Date(ty, tm - 1, td + add, 12, 0, 0, 0);
    const y = cell.getFullYear();
    const m0 = cell.getMonth();
    const d = cell.getDate();
    const iso = calendarDateToIso(y, m0, d);
    if (iso < todayIso || isBlocked(iso, av)) continue;

    const monthlyConsumed = monthlyConsumedLookup?.(y, m0) ?? false;
    const labels = getAllowedSlotLabelsForDate(av, y, m0, d, now, {
      monthlyPatternConsumedThisIstMonth: monthlyConsumed,
    });
    const future = filterPastSlotLabels(labels, y, m0, d, now);
    if (future.length === 0) continue;
    return `Next available: ${formatDateLabel(iso)} · ${future[0]}`;
  }

  return NO_UPCOMING_AVAILABILITY_LABEL;
}
