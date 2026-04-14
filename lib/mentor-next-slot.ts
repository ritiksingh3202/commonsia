import {
  defaultMentorAvailability,
  WEEKDAY_KEYS,
  type MentorAvailabilityJson,
  type WeekdayKey,
} from "@/components/mentor/mentor-setup-constants";

/** Shown on cards when no weekly/specific slot is available in the near window. */
export const NO_UPCOMING_AVAILABILITY_LABEL = "Availability coming soon";

function jsDayToKey(day: number): WeekdayKey {
  const map: WeekdayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[day] ?? "mon";
}

/** Merge saved JSON into defaults (subset of MentorAvailabilityForm.mergeAvailability). */
export function mergeAvailabilityForSlot(raw: unknown): MentorAvailabilityJson {
  const d = defaultMentorAvailability();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Partial<MentorAvailabilityJson>;
  if (o.availabilityType === "weekly" || o.availabilityType === "specific") {
    d.availabilityType = o.availabilityType;
  }
  const kinds = ["weekly", "fifteen_days", "monthly", "custom"] as const;
  if (o.availabilityWindowKind && kinds.includes(o.availabilityWindowKind as (typeof kinds)[number])) {
    d.availabilityWindowKind = o.availabilityWindowKind;
  }
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
  return d;
}

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

/**
 * Human-readable “next slot” line for mentor cards (weekly + specific dates, respects blocked days).
 */
export function formatNextAvailableSlotLine(raw: unknown, now = new Date()): string {
  const av = mergeAvailabilityForSlot(raw);

  const todayIso = now.toISOString().slice(0, 10);

  if (av.availabilityType === "specific" && av.specificDates.length > 0) {
    const sorted = [...new Set(av.specificDates)].sort();
    for (const iso of sorted) {
      if (iso < todayIso) continue;
      const slots = av.specificDateSlots[iso] ?? [];
      if (slots.length === 0) continue;
      const first = slots[0];
      return `Next available: ${formatDateLabel(iso)} · ${first}`;
    }
  }

  const horizon =
    av.planningHorizonDays ??
    (av.availabilityWindowKind === "fifteen_days" ? 15 : av.availabilityWindowKind === "monthly" ? 31 : 21);
  const maxDays = Math.min(Math.max(horizon, 1), 60);
  for (let add = 0; add < maxDays; add++) {
    const d = new Date(now);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + add);
    const iso = d.toISOString().slice(0, 10);
    if (isBlocked(iso, av)) continue;
    const key = jsDayToKey(d.getDay());
    const slots = av.weeklySlots[key] ?? [];
    if (slots.length === 0) continue;
    return `Next available: ${formatDateLabel(iso)} · ${slots[0]}`;
  }

  return NO_UPCOMING_AVAILABILITY_LABEL;
}
