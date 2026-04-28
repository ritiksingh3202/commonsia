import {
  defaultMentorAvailability,
  normalizeAvailabilityWindowKind,
  WEEKDAY_KEYS,
  type MentorAvailabilityJson,
} from "@/components/mentor/mentor-setup-constants";

const SESSION_DURATIONS = new Set<number>([15, 30, 45, 60, 90]);

/** Merge saved JSON into defaults (used by booking + card copy). */
export function mergeAvailabilityForSlot(raw: unknown): MentorAvailabilityJson {
  const d = defaultMentorAvailability();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Partial<MentorAvailabilityJson>;
  if (o.availabilityType === "weekly" || o.availabilityType === "specific") {
    d.availabilityType = o.availabilityType;
  }
  if (typeof o.sessionDurationMinutes === "number" && SESSION_DURATIONS.has(o.sessionDurationMinutes)) {
    d.sessionDurationMinutes = o.sessionDurationMinutes as MentorAvailabilityJson["sessionDurationMinutes"];
  }
  d.availabilityWindowKind = normalizeAvailabilityWindowKind(
    typeof o.availabilityWindowKind === "string" ? o.availabilityWindowKind : undefined,
  );
  if (typeof o.planningHorizonDays === "number" && o.planningHorizonDays >= 1 && o.planningHorizonDays <= 90) {
    d.planningHorizonDays = o.planningHorizonDays;
  }
  if (o.weeklySlots && typeof o.weeklySlots === "object") {
    for (const k of WEEKDAY_KEYS) {
      const arr = (o.weeklySlots as Record<string, unknown>)[k];
      if (Array.isArray(arr)) {
        d.weeklySlots[k] = arr.filter((x): x is string => typeof x === "string");
      }
    }
  }
  if (Array.isArray(o.specificDates)) {
    d.specificDates = o.specificDates.filter((x): x is string => typeof x === "string");
  }
  if (o.specificDateSlots && typeof o.specificDateSlots === "object") {
    d.specificDateSlots = { ...d.specificDateSlots };
    for (const key of Object.keys(d.specificDateSlots)) {
      const arr = d.specificDateSlots[key];
      if (!Array.isArray(arr)) d.specificDateSlots[key] = [];
    }
  }
  if (Array.isArray(o.blockedDates)) {
    d.blockedDates = o.blockedDates.filter(
      (b): b is { date: string } =>
        !!b && typeof b === "object" && typeof (b as { date?: unknown }).date === "string",
    );
  }
  if (o.extraAvailabilitySlots && typeof o.extraAvailabilitySlots === "object") {
    const target = d.extraAvailabilitySlots ?? {};
    d.extraAvailabilitySlots = target;
    const ex = o.extraAvailabilitySlots as Record<string, unknown>;
    for (const key of Object.keys(ex)) {
      const arr = ex[key];
      if (Array.isArray(arr)) {
        target[key] = arr.filter((x): x is string => typeof x === "string");
      }
    }
  }
  if (typeof o.recurringWeekdayJs === "number" && o.recurringWeekdayJs >= 0 && o.recurringWeekdayJs <= 6) {
    d.recurringWeekdayJs = o.recurringWeekdayJs;
  }
  if ("biweeklyAnchorIso" in o) {
    if (o.biweeklyAnchorIso === null) d.biweeklyAnchorIso = null;
    else if (typeof o.biweeklyAnchorIso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.biweeklyAnchorIso)) {
      d.biweeklyAnchorIso = o.biweeklyAnchorIso;
    }
  }
  if (Array.isArray(o.patternSlotLabels)) {
    d.patternSlotLabels = o.patternSlotLabels.filter((x): x is string => typeof x === "string");
  }
  return d;
}
