import {
  MENTOR_TIME_SLOTS_HALF,
  type WeekdayKey,
  WEEKDAY_KEYS,
} from "@/components/mentor/mentor-setup-constants";

/** Parse "06:30 PM" style label to minutes from midnight. */
export function slotLabelToMinutes(slot: string): number | null {
  const m = slot.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let hh = Number(m[1]);
  const mm = Number(m[2]);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && hh !== 12) hh += 12;
  if (ap === "AM" && hh === 12) hh = 0;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

export function minutesToTimeInput(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeInputToMinutes(s: string): number | null {
  const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(mm) || h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

/** Half-open [start, end): include each slot start that falls in the range. */
export function expandIntervalToSlotLabels(startInput: string, endInput: string): string[] {
  const s = timeInputToMinutes(startInput);
  const e = timeInputToMinutes(endInput);
  if (s === null || e === null || e <= s) return [];
  const out: string[] = [];
  for (const label of MENTOR_TIME_SLOTS_HALF) {
    const sm = slotLabelToMinutes(label);
    if (sm !== null && sm >= s && sm < e) out.push(label);
  }
  return out;
}

export function collapseSlotLabelsToIntervals(slots: string[]): { start: string; end: string }[] {
  if (slots.length === 0) return [];
  const mins = [
    ...new Set(slots.map(slotLabelToMinutes).filter((x): x is number => x !== null)),
  ].sort((a, b) => a - b);
  const groups: number[][] = [];
  for (const m of mins) {
    const g = groups[groups.length - 1];
    if (g && m === g[g.length - 1] + 30) g.push(m);
    else groups.push([m]);
  }
  return groups.map((g) => ({
    start: minutesToTimeInput(g[0]),
    end: minutesToTimeInput(g[g.length - 1] + 30),
  }));
}

export function sortSlotLabels(labels: string[]): string[] {
  return [...labels].sort((a, b) => (slotLabelToMinutes(a) ?? 0) - (slotLabelToMinutes(b) ?? 0));
}

export function compactRangesFromLabels(labels: string[]): string[] {
  return collapseSlotLabelsToIntervals(labels).map((i) => `${i.start}-${i.end}`);
}

export function labelsFromCompactRanges(ranges: string[]): string[] {
  const out: string[] = [];
  for (const r of ranges) {
    const m = r.trim().match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
    if (!m) continue;
    out.push(...expandIntervalToSlotLabels(m[1], m[2]));
  }
  return sortSlotLabels([...new Set(out)]);
}

export type DayIntervalRow = { key: WeekdayKey; enabled: boolean; intervals: { start: string; end: string }[] };

export function weeklyRowsFromSlotMap(
  weeklySlots: Record<WeekdayKey, string[]>,
): DayIntervalRow[] {
  return WEEKDAY_KEYS.map((key) => {
    const slots = weeklySlots[key] ?? [];
    const intervals = collapseSlotLabelsToIntervals(slots);
    return {
      key,
      enabled: slots.length > 0,
      intervals: intervals.length > 0 ? intervals : [{ start: "09:00", end: "17:00" }],
    };
  });
}

export function weeklySlotsFromRows(rows: DayIntervalRow[]): Record<WeekdayKey, string[]> {
  const out: Record<WeekdayKey, string[]> = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };
  for (const row of rows) {
    if (!row.enabled) continue;
    const set = new Set<string>();
    for (const intv of row.intervals) {
      for (const lab of expandIntervalToSlotLabels(intv.start, intv.end)) {
        set.add(lab);
      }
    }
    out[row.key] = sortSlotLabels([...set]);
  }
  return out;
}
