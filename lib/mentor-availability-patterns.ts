import type { WeekdayKey } from "@/components/mentor/mentor-setup-constants";
import { expandIntervalToSlotLabels, jsWeekdayFromIsoLocal, sortSlotLabels } from "@/lib/mentor-availability-slots";

export function weekdayKeyFromJs(js: number): WeekdayKey {
  const map: WeekdayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[js] ?? "mon";
}

/** Next `weekdayJs` on or after `from` (local calendar). */
export function defaultBiweeklyAnchorFromTodayIso(todayIso: string, weekdayJs: number): string {
  const [y, m, d] = todayIso.split("-").map(Number);
  if (!y || !m || !d) return nextIsoForWeekdayOnOrAfter(weekdayJs, new Date());
  const from = new Date(y, m - 1, d, 12, 0, 0, 0);
  return nextIsoForWeekdayOnOrAfter(weekdayJs, from);
}

export function nextIsoForWeekdayOnOrAfter(weekdayJs: number, from: Date): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    if (d.getDay() === weekdayJs) {
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${mo}-${day}`;
    }
    d.setDate(d.getDate() + 1);
  }
  const y = from.getFullYear();
  const mo = String(from.getMonth() + 1).padStart(2, "0");
  const day = String(from.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/**
 * Bi-weekly parity: same weekday as anchor, and whole weeks between anchor and candidate
 * have an even count (anchor week = week 0).
 */
export function biweeklyAllowsDate(candidateIso: string, weekdayJs: number, anchorIso: string | null | undefined): boolean {
  if (jsWeekdayFromIsoLocal(candidateIso) !== weekdayJs) return false;
  const anchor = anchorIso?.trim() || candidateIso;
  if (jsWeekdayFromIsoLocal(anchor) !== weekdayJs) return false;
  const a = parseIsoLocal(anchor);
  const c = parseIsoLocal(candidateIso);
  if (!a || !c) return false;
  const diffDays = Math.round((c.getTime() - a.getTime()) / 86_400_000);
  if (diffDays < 0) return false;
  const weeks = Math.floor(diffDays / 7);
  return weeks % 2 === 0;
}

function parseIsoLocal(iso: string): Date | null {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** Preset 2-hour blocks (IST labels) for weekend / recurring pickers. */
export const WEEKEND_TIME_PRESETS: readonly { id: string; label: string; range: readonly [string, string] }[] = [
  { id: "10-12", label: "10:00 AM – 12:00 PM", range: ["10:00", "12:00"] },
  { id: "12-2", label: "12:00 PM – 2:00 PM", range: ["12:00", "14:00"] },
  { id: "2-4", label: "2:00 PM – 4:00 PM", range: ["14:00", "16:00"] },
  { id: "4-6", label: "4:00 PM – 6:00 PM", range: ["16:00", "18:00"] },
  { id: "6-8", label: "6:00 PM – 8:00 PM", range: ["18:00", "20:00"] },
] as const;

export function slotLabelsForPresetRange(start24: string, end24: string): string[] {
  return expandIntervalToSlotLabels(start24, end24);
}

export function slotLabelsForPresetsSelected(
  selectedPresetIds: Set<string>,
  customLabels: string[],
): string[] {
  const set = new Set<string>();
  for (const p of WEEKEND_TIME_PRESETS) {
    if (selectedPresetIds.has(p.id)) {
      for (const lab of slotLabelsForPresetRange(p.range[0], p.range[1])) {
        set.add(lab);
      }
    }
  }
  for (const lab of customLabels) set.add(lab);
  return sortSlotLabels([...set]);
}

export function presetIdsFromSlotLabels(labels: string[]): Set<string> {
  const set = new Set(labels);
  const out = new Set<string>();
  for (const p of WEEKEND_TIME_PRESETS) {
    const labs = slotLabelsForPresetRange(p.range[0], p.range[1]);
    if (labs.length && labs.every((l) => set.has(l))) out.add(p.id);
  }
  return out;
}
