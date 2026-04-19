import { normalizeAvailabilityWindowKind } from "@/components/mentor/mentor-setup-constants";
import { mergeAvailabilityForSlot } from "@/lib/mentor-availability-merge";

const CAL_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * Short label for directory cards (pattern), separate from {@link formatNextAvailableSlotLine}.
 */
export function formatMentorAvailabilityPatternLabel(raw: unknown): string {
  const av = mergeAvailabilityForSlot(raw);
  if (av.availabilityType === "specific") {
    const k = normalizeAvailabilityWindowKind(av.availabilityWindowKind);
    if (k === "custom") return "Custom dates · IST";
    if (k === "fifteen_days") {
      const w = av.recurringWeekdayJs;
      const lab = typeof w === "number" && w >= 0 && w <= 6 ? CAL_WEEK[w] : "weekday";
      return `Bi-weekly ${lab}s · IST`;
    }
    if (k === "monthly") {
      const w = av.recurringWeekdayJs;
      const lab = typeof w === "number" && w >= 0 && w <= 6 ? CAL_WEEK[w] : "weekday";
      return `Monthly ${lab}s · IST`;
    }
    return "Specific dates · IST";
  }

  const k = normalizeAvailabilityWindowKind(av.availabilityWindowKind);
  if (k === "weekends") return "Weekends · IST";
  if (k === "fifteen_days") {
    const w = av.recurringWeekdayJs;
    const lab = typeof w === "number" && w >= 0 && w <= 6 ? CAL_WEEK[w] : "weekday";
    return `Bi-weekly ${lab}s · IST`;
  }
  if (k === "monthly") {
    const w = av.recurringWeekdayJs;
    const lab = typeof w === "number" && w >= 0 && w <= 6 ? CAL_WEEK[w] : "weekday";
    return `Monthly ${lab}s · IST`;
  }
  return "Weekly pattern · IST";
}
