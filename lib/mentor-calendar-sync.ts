import type { MentorAvailabilityJson } from "@/components/mentor/mentor-setup-constants";
import { WEEKDAY_KEYS, type WeekdayKey } from "@/components/mentor/mentor-setup-constants";

const TZ = process.env.DEFAULT_CALENDAR_TIMEZONE ?? "Asia/Kolkata";

/** Default wall-clock offset for slot strings when building RFC3339 (mockups use India). */
const OFFSET = process.env.DEFAULT_CALENDAR_TZ_OFFSET ?? "+05:30";

/**
 * Parse "09:30 AM" style label + YYYY-MM-DD into a correct instant (via ISO with offset).
 */
export function combineDateAndSlotLabel(isoDate: string, slotLabel: string): Date | null {
  const ymd = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const m = slotLabel.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!ymd || !m) return null;
  let hh = Number(m[1]);
  const mm = Number(m[2]);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && hh !== 12) hh += 12;
  if (ap === "AM" && hh === 12) hh = 0;
  const isoTime = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
  const d = new Date(`${isoDate}T${isoTime}${OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const dayIndex: Record<WeekdayKey, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function nextWeekdayDates(from: Date, weekday: number, count: number): Date[] {
  const out: Date[] = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const add = (weekday - cur.getDay() + 7) % 7;
  cur.setDate(cur.getDate() + add);
  for (let i = 0; i < count; i++) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 7);
  }
  return out;
}

export type CalendarEventInput = {
  summary: string;
  start: Date;
  end: Date;
};

export function buildAvailabilityCalendarEvents(av: MentorAvailabilityJson): CalendarEventInput[] {
  const durationMin = av.sessionDurationMinutes;
  const events: CalendarEventInput[] = [];
  const now = new Date();

  if (av.availabilityType === "specific") {
    const map = av.specificDateSlots ?? {};
    for (const iso of av.specificDates) {
      const slots = map[iso] ?? [];
      for (const slot of slots) {
        const start = combineDateAndSlotLabel(iso, slot);
        if (!start) continue;
        const end = new Date(start.getTime() + durationMin * 60 * 1000);
        events.push({
          summary: "Commonsia — Mentor availability",
          start,
          end,
        });
      }
    }
    return events;
  }

  for (const day of WEEKDAY_KEYS) {
    const slots = av.weeklySlots[day] ?? [];
    if (slots.length === 0) continue;
    const wd = dayIndex[day];
    const dates = nextWeekdayDates(now, wd, 8);
    for (const dayDate of dates) {
      const iso = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, "0")}-${String(dayDate.getDate()).padStart(2, "0")}`;
      for (const slot of slots) {
        const start = combineDateAndSlotLabel(iso, slot);
        if (!start) continue;
        const end = new Date(start.getTime() + durationMin * 60 * 1000);
        events.push({
          summary: "Commonsia — Mentor availability",
          start,
          end,
        });
      }
    }
  }

  void TZ;
  return events;
}
