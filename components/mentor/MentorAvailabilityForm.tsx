"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  defaultMentorAvailability,
  defaultSessionTemplates,
  emptyWeeklySlots,
  type AvailabilityWindowKind,
  type BlockedDateEntry,
  type MentorAvailabilityJson,
  type SessionTemplateRow,
  maxStudentsToMenteeBand,
  menteeBandToMaxStudents,
  type MenteeCapacityBand,
  normalizeAvailabilityWindowKind,
  type WeekdayKey,
  WEEKDAY_KEYS,
} from "@/components/mentor/mentor-setup-constants";
import { MentorSchedulePanel } from "@/components/mentor/MentorSchedulePanel";
import { MandatorySetupReminderModal } from "@/components/setup/MandatorySetupReminderModal";
import {
  defaultBiweeklyAnchorFromTodayIso,
  presetIdsFromSlotLabels,
  slotLabelsForPresetRange,
  slotLabelsForPresetsSelected,
  WEEKEND_TIME_PRESETS,
} from "@/lib/mentor-availability-patterns";
import { mergeAvailabilityForSlot } from "@/lib/mentor-availability-merge";
import { todayIsoInBookingTz } from "@/lib/booking-availability-slots";
import {
  compactRangesFromLabels,
  jsWeekdayFromIsoLocal,
  labelsFromCompactRanges,
  type DayIntervalRow,
  sortSlotLabels,
  weeklyIntervalBandsFromRows,
  weeklyRowsFromPersisted,
  weeklyRowsFromSlotMap,
  weeklySlotsFromRows,
} from "@/lib/mentor-availability-slots";

type TabId = "weekly" | "specific";

type OverrideRow = {
  id: string;
  date: string;
  kind: "extra" | "blocked";
  ranges: string[];
  reason: string;
};

const field =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-[#0a0a0a] shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

const REQ = <span className="text-red-600">*</span>;

function mergeAvailability(raw: unknown): MentorAvailabilityJson {
  const d = defaultMentorAvailability();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Partial<MentorAvailabilityJson>;
  const dur = o.sessionDurationMinutes;
  if (dur === 15 || dur === 30 || dur === 45 || dur === 60 || dur === 90) {
    d.sessionDurationMinutes = dur;
  }
  if (o.availabilityType === "weekly" || o.availabilityType === "specific") {
    d.availabilityType = o.availabilityType;
  }
  if (Array.isArray(o.specificDates)) {
    d.specificDates = o.specificDates.filter((x): x is string => typeof x === "string");
  }
  d.specificDateSlots = {};
  if (o.specificDateSlots && typeof o.specificDateSlots === "object") {
    for (const iso of d.specificDates) {
      const arr = (o.specificDateSlots as Record<string, unknown>)[iso];
      d.specificDateSlots[iso] = Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
    }
  } else {
    for (const iso of d.specificDates) d.specificDateSlots[iso] = [];
  }
  if (o.weeklySlots && typeof o.weeklySlots === "object") {
    const ws = emptyWeeklySlots();
    for (const k of WEEKDAY_KEYS) {
      const arr = (o.weeklySlots as Record<string, unknown>)[k];
      if (Array.isArray(arr)) {
        ws[k] = arr.filter((x): x is string => typeof x === "string");
      }
    }
    d.weeklySlots = ws;
  }
  if (typeof o.maxStudents === "number" && o.maxStudents >= 1 && o.maxStudents <= 50) {
    d.maxStudents = o.maxStudents;
  }
  if (typeof o.autoAcceptSessionRequests === "boolean") d.autoAcceptSessionRequests = o.autoAcceptSessionRequests;
  if (typeof o.bufferBetweenSessions === "string") d.bufferBetweenSessions = o.bufferBetweenSessions;
  if (typeof o.advanceBookingWindow === "string") d.advanceBookingWindow = o.advanceBookingWindow;
  if (typeof o.smartAutomationEnabled === "boolean") d.smartAutomationEnabled = o.smartAutomationEnabled;
  if (typeof o.maxSessionsPerWeek === "number" && o.maxSessionsPerWeek >= 1 && o.maxSessionsPerWeek <= 50) {
    d.maxSessionsPerWeek = o.maxSessionsPerWeek;
  }
  if (typeof o.bufferMinutes === "number" && o.bufferMinutes >= 0 && o.bufferMinutes <= 240) {
    d.bufferMinutes = o.bufferMinutes;
  }
  if (Array.isArray(o.sessionTemplates) && o.sessionTemplates.length > 0) {
    d.sessionTemplates = o.sessionTemplates.filter(
      (t): t is SessionTemplateRow =>
        t &&
        typeof t === "object" &&
        typeof (t as SessionTemplateRow).id === "string" &&
        typeof (t as SessionTemplateRow).name === "string" &&
        typeof (t as SessionTemplateRow).durationMinutes === "number",
    );
  }
  if (Array.isArray(o.blockedDates)) {
    d.blockedDates = o.blockedDates.filter(
      (b): b is BlockedDateEntry => b && typeof b === "object" && typeof b.date === "string",
    );
  }
  if (o.extraAvailabilitySlots && typeof o.extraAvailabilitySlots === "object") {
    d.extraAvailabilitySlots = {};
    for (const [k, v] of Object.entries(o.extraAvailabilitySlots)) {
      if (Array.isArray(v)) {
        d.extraAvailabilitySlots[k] = v.filter((x): x is string => typeof x === "string");
      }
    }
  }
  if (typeof o.acceptingNewMentees === "boolean") d.acceptingNewMentees = o.acceptingNewMentees;
  if (d.availabilityType === "specific") {
    d.availabilityWindowKind = "custom";
  } else {
    d.availabilityWindowKind = normalizeAvailabilityWindowKind(
      typeof o.availabilityWindowKind === "string" ? o.availabilityWindowKind : undefined,
    );
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
  const bands: MenteeCapacityBand[] = ["0-5", "5-10", "10+"];
  if (o.menteeCapacityBand && bands.includes(o.menteeCapacityBand)) {
    d.menteeCapacityBand = o.menteeCapacityBand;
  }
  if (typeof o.planningHorizonDays === "number" && o.planningHorizonDays >= 1 && o.planningHorizonDays <= 180) {
    d.planningHorizonDays = o.planningHorizonDays;
  }
  if (!d.menteeCapacityBand) {
    d.menteeCapacityBand = maxStudentsToMenteeBand(d.maxStudents);
  }
  return d;
}

function totalWeeklySlots(weeklySlots: Record<WeekdayKey, string[]>): number {
  return WEEKDAY_KEYS.reduce((acc, k) => acc + weeklySlots[k].length, 0);
}

function totalWeekendSlots(weeklySlots: Record<WeekdayKey, string[]>): number {
  return (weeklySlots.sat?.length ?? 0) + (weeklySlots.sun?.length ?? 0);
}

function primarySessionDuration(templates: SessionTemplateRow[]): 15 | 30 | 45 | 60 | 90 {
  const allowed = new Set([15, 30, 45, 60, 90]);
  const first = templates.find((t) => t.enabled);
  const d = first?.durationMinutes ?? 60;
  return allowed.has(d) ? (d as 15 | 30 | 45 | 60 | 90) : 60;
}

/** Session templates are not edited on this screen; fall back to defaults if data is empty. */
function sessionTemplatesForPayload(templates: SessionTemplateRow[]): SessionTemplateRow[] {
  if (templates.some((t) => t.enabled && t.name.trim().length > 0)) return templates;
  return defaultSessionTemplates();
}

function overridesFromAv(av: MentorAvailabilityJson): OverrideRow[] {
  const rows: OverrideRow[] = [];
  let i = 0;
  for (const b of av.blockedDates ?? []) {
    rows.push({
      id: `o-${i++}`,
      date: b.date,
      kind: "blocked",
      ranges: [],
      reason: b.reason ?? "",
    });
  }
  for (const [date, labels] of Object.entries(av.extraAvailabilitySlots ?? {})) {
    if (!labels?.length) continue;
    rows.push({
      id: `o-${i++}`,
      date,
      kind: "extra",
      ranges: compactRangesFromLabels(labels),
      reason: "",
    });
  }
  return rows;
}

function newOverrideRow(kind: OverrideRow["kind"]): OverrideRow {
  return {
    id: `o-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: "",
    kind,
    ranges: [],
    reason: "",
  };
}

function isCalendarScheduleMode(kind: AvailabilityWindowKind): boolean {
  return kind === "custom";
}

function initSpecificDatesSlots(av: MentorAvailabilityJson): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const iso of av.specificDates ?? []) {
    const raw = av.specificDateSlots[iso] ?? [];
    out[iso] = sortSlotLabels(raw.filter((x): x is string => typeof x === "string"));
  }
  return out;
}

type Props = {
  initialJson: unknown;
  mentorOnboardingComplete: boolean;
};

export function MentorAvailabilityForm({ initialJson, mentorOnboardingComplete }: Props) {
  const router = useRouter();
  const base = useMemo(() => mergeAvailability(initialJson), [initialJson]);
  const slotProfile = useMemo(() => mergeAvailabilityForSlot(initialJson), [initialJson]);

  const [tab, setTab] = useState<TabId>("weekly");
  const [weeklyRows, setWeeklyRows] = useState<DayIntervalRow[]>(() =>
    weeklyRowsFromPersisted(slotProfile.weeklySlots, slotProfile.weeklyIntervalBands),
  );
  const [sessionTemplates, setSessionTemplates] = useState<SessionTemplateRow[]>(
    () => (base.sessionTemplates?.length ? base.sessionTemplates : defaultSessionTemplates()),
  );
  const [overrideRows, setOverrideRows] = useState<OverrideRow[]>(() => {
    const r = overridesFromAv(base);
    return r.length ? r : [];
  });

  const [availabilityWindowKind, setAvailabilityWindowKind] = useState<AvailabilityWindowKind>(() =>
    base.availabilityType === "specific" ? "custom" : normalizeAvailabilityWindowKind(base.availabilityWindowKind),
  );
  const [recurringWeekdayJs, setRecurringWeekdayJs] = useState(() =>
    typeof base.recurringWeekdayJs === "number" ? base.recurringWeekdayJs : 5,
  );
  const [patternSlotLabels, setPatternSlotLabels] = useState<string[]>(() =>
    sortSlotLabels(base.patternSlotLabels ?? []),
  );
  const [specificDatesSlots, setSpecificDatesSlots] = useState<Record<string, string[]>>(() =>
    initSpecificDatesSlots(base),
  );
  const [calendarView, setCalendarView] = useState<{ year: number; month: number }>(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [mandatoryExitOpen, setMandatoryExitOpen] = useState(false);
  const skipFirstAutoSave = useRef(true);
  const saveInFlightRef = useRef(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const blockAutosaveRef = useRef(false);

  useEffect(() => {
    const merged = mergeAvailability(initialJson);
    const slotted = mergeAvailabilityForSlot(initialJson);
    setWeeklyRows(weeklyRowsFromPersisted(slotted.weeklySlots, slotted.weeklyIntervalBands));
    setSessionTemplates(merged.sessionTemplates?.length ? merged.sessionTemplates : defaultSessionTemplates());
    const ov = overridesFromAv(merged);
    setOverrideRows(ov.length ? ov : []);
    setAvailabilityWindowKind(
      merged.availabilityType === "specific"
        ? "custom"
        : normalizeAvailabilityWindowKind(merged.availabilityWindowKind),
    );
    setRecurringWeekdayJs(typeof merged.recurringWeekdayJs === "number" ? merged.recurringWeekdayJs : 5);
    setPatternSlotLabels(sortSlotLabels(merged.patternSlotLabels ?? []));
    setSpecificDatesSlots(initSpecificDatesSlots(merged));
    const dates = (merged.specificDates ?? []).filter(Boolean).sort();
    if (dates.length > 0) {
      const [y, mo] = dates[0]!.split("-").map(Number);
      setCalendarView({ year: y, month: mo - 1 });
    } else {
      const n = new Date();
      setCalendarView({ year: n.getFullYear(), month: n.getMonth() });
    }
  }, [initialJson]);

  const weeklySlotsPreview = useMemo(() => weeklySlotsFromRows(weeklyRows), [weeklyRows]);
  const weeklyCount = useMemo(() => totalWeeklySlots(weeklySlotsPreview), [weeklySlotsPreview]);
  const scheduleSlotCount = useMemo(() => {
    if (availabilityWindowKind === "fifteen_days" || availabilityWindowKind === "monthly") {
      return presetIdsFromSlotLabels(patternSlotLabels).size;
    }
    if (availabilityWindowKind === "weekends") {
      return presetIdsFromSlotLabels([...(weeklySlotsPreview.sat ?? []), ...(weeklySlotsPreview.sun ?? [])]).size;
    }
    if (availabilityWindowKind === "custom") {
      let n = 0;
      for (const slots of Object.values(specificDatesSlots)) {
        n += presetIdsFromSlotLabels(slots).size;
      }
      return n;
    }
    return weeklyCount;
  }, [availabilityWindowKind, patternSlotLabels, weeklySlotsPreview, weeklyCount, specificDatesSlots]);

  const togglePatternPreset = useCallback((id: string) => {
    setPatternSlotLabels((prev) => {
      const selected = presetIdsFromSlotLabels(prev);
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      const presetUnion = new Set<string>();
      for (const p of WEEKEND_TIME_PRESETS) {
        for (const lab of slotLabelsForPresetRange(p.range[0], p.range[1])) {
          presetUnion.add(lab);
        }
      }
      const custom = prev.filter((l) => !presetUnion.has(l));
      return sortSlotLabels([...slotLabelsForPresetsSelected(selected, custom)]);
    });
  }, []);

  const togglePatternGridSlot = useCallback((label: string) => {
    setPatternSlotLabels((prev) => {
      const i = prev.indexOf(label);
      if (i >= 0) return prev.filter((_, idx) => idx !== i);
      return sortSlotLabels([...prev, label]);
    });
  }, []);

  const clearPatternSlots = useCallback(() => setPatternSlotLabels([]), []);

  const toggleWeeklySlot = (day: WeekdayKey, label: string) => {
    setWeeklyRows((prev) => {
      const map = weeklySlotsFromRows(prev);
      const cur = [...(map[day] ?? [])];
      const i = cur.indexOf(label);
      if (i >= 0) cur.splice(i, 1);
      else cur.push(label);
      map[day] = sortSlotLabels(cur);
      return weeklyRowsFromSlotMap(map);
    });
    setError(null);
  };

  const clearWeeklySlots = () => {
    setWeeklyRows(weeklyRowsFromSlotMap(emptyWeeklySlots()));
    setError(null);
  };

  const clearWeeklyDay = useCallback((day: WeekdayKey) => {
    setWeeklyRows((prev) => {
      const m = weeklySlotsFromRows(prev);
      m[day] = [];
      return weeklyRowsFromSlotMap(m);
    });
    setError(null);
  }, []);

  const toggleCustomDatePreset = useCallback((iso: string, presetId: string) => {
    const p = WEEKEND_TIME_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    const labs = slotLabelsForPresetRange(p.range[0], p.range[1]);
    setSpecificDatesSlots((prev) => {
      const cur = [...(prev[iso] ?? [])];
      const allOn = labs.length > 0 && labs.every((lab) => cur.includes(lab));
      let next: string[];
      if (allOn) {
        next = cur.filter((lab) => !labs.includes(lab));
      } else {
        next = sortSlotLabels([...new Set([...cur, ...labs])]);
      }
      return { ...prev, [iso]: next };
    });
    setError(null);
  }, []);

  const toggleSharedCustomDatePreset = useCallback((presetId: string) => {
    const p = WEEKEND_TIME_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    const labs = slotLabelsForPresetRange(p.range[0], p.range[1]);
    setSpecificDatesSlots((prev) => {
      const dates = Object.keys(prev).sort();
      if (dates.length < 2) return prev;
      const w0 = jsWeekdayFromIsoLocal(dates[0]!);
      if (!dates.every((d) => jsWeekdayFromIsoLocal(d) === w0)) return prev;
      const allOn = dates.every((iso) => labs.length > 0 && labs.every((lab) => (prev[iso] ?? []).includes(lab)));
      const next = { ...prev };
      for (const iso of dates) {
        const cur = [...(next[iso] ?? [])];
        let updated: string[];
        if (allOn) {
          updated = cur.filter((lab) => !labs.includes(lab));
        } else {
          updated = sortSlotLabels([...new Set([...cur, ...labs])]);
        }
        next[iso] = updated;
      }
      return next;
    });
    setError(null);
  }, []);

  const toggleCalendarDate = (iso: string) => {
    setSpecificDatesSlots((prev) => {
      const next = { ...prev };
      if (iso in next) delete next[iso];
      else next[iso] = [];
      return next;
    });
    setError(null);
  };

  const clearCalendarSelection = () => {
    setSpecificDatesSlots({});
    setError(null);
  };

  const onCalendarPrev = () => {
    setCalendarView((v) => {
      if (v.month <= 0) return { year: v.year - 1, month: 11 };
      return { ...v, month: v.month - 1 };
    });
  };

  const onCalendarNext = () => {
    setCalendarView((v) => {
      if (v.month >= 11) return { year: v.year + 1, month: 0 };
      return { ...v, month: v.month + 1 };
    });
  };

  const calendarSelectable = useCallback(
    (iso: string) => {
      const parts = iso.split("-").map(Number);
      const y = parts[0]!;
      const mo = parts[1]!;
      const d = parts[2]!;
      const cell = new Date(y, mo - 1, d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      cell.setHours(0, 0, 0, 0);
      return cell >= today;
    },
    [],
  );

  const autosavePayloadKey = useMemo(
    () =>
      JSON.stringify({
        weeklyRows,
        sessionTemplates,
        overrideRows,
        availabilityWindowKind,
        specificDatesSlots,
        calendarView,
        recurringWeekdayJs,
        patternSlotLabels,
      }),
    [
      weeklyRows,
      sessionTemplates,
      overrideRows,
      availabilityWindowKind,
      specificDatesSlots,
      calendarView,
      recurringWeekdayJs,
      patternSlotLabels,
    ],
  );

  const validate = (): boolean => {
    if (availabilityWindowKind === "custom") {
      const ok = Object.entries(specificDatesSlots).some(([, slots]) => slots.length > 0);
      if (!ok) {
        setError("For custom availability, pick at least one future date and add at least one two-hour range (IST).");
        setTab("weekly");
        return false;
      }
    } else if (availabilityWindowKind === "fifteen_days" || availabilityWindowKind === "monthly") {
      if (presetIdsFromSlotLabels(patternSlotLabels).size === 0) {
        setError("Choose at least one time range for your rhythm weekday.");
        setTab("weekly");
        return false;
      }
    } else if (totalWeekendSlots(weeklySlotsFromRows(weeklyRows)) === 0) {
      setError("Add at least one weekend time range (Saturday and/or Sunday, IST).");
      setTab("weekly");
      return false;
    }
    setError(null);
    return true;
  };

  const buildPayload = (): MentorAvailabilityJson => {
    const templatesOut = sessionTemplatesForPayload(sessionTemplates);
    const blockedDates: BlockedDateEntry[] = [];
    const extraAvailabilitySlots: Record<string, string[]> = {};
    for (const row of overrideRows) {
      const d = row.date.trim();
      if (!d) continue;
      if (row.kind === "blocked") {
        blockedDates.push({ date: d, reason: row.reason.trim() || undefined });
      } else {
        const labs = labelsFromCompactRanges(row.ranges);
        if (labs.length) extraAvailabilitySlots[d] = labs;
      }
    }
    const buf = 0;
    const snap = mergeAvailability(initialJson);
    const maxSess = Math.max(1, Math.min(50, snap.maxSessionsPerWeek ?? 2));
    const bandMax = menteeBandToMaxStudents(snap.menteeCapacityBand ?? maxStudentsToMenteeBand(snap.maxStudents));
    const menteeCapacityBand = snap.menteeCapacityBand ?? maxStudentsToMenteeBand(snap.maxStudents);
    const acceptingNewMentees = snap.acceptingNewMentees ?? true;
    const kind = availabilityWindowKind;
    const planningHorizonDays =
      kind === "fifteen_days" ? 15 : kind === "monthly" ? 120 : kind === "weekends" ? 21 : base.planningHorizonDays ?? 30;

    if (isCalendarScheduleMode(kind)) {
      const specificDates: string[] = [];
      const specificDateSlots: Record<string, string[]> = {};
      for (const [iso, slots] of Object.entries(specificDatesSlots)) {
        const labs = sortSlotLabels(slots.filter((x) => typeof x === "string"));
        if (!labs.length) continue;
        specificDates.push(iso);
        specificDateSlots[iso] = labs;
      }
      const sortedDates = [...new Set(specificDates)].sort();
      const cleanSlots: Record<string, string[]> = {};
      for (const iso of sortedDates) {
        cleanSlots[iso] = specificDateSlots[iso] ?? [];
      }
      return {
        ...base,
        availabilityType: "specific",
        availabilityWindowKind: kind,
        menteeCapacityBand,
        planningHorizonDays,
        weeklySlots: emptyWeeklySlots(),
        specificDates: sortedDates,
        specificDateSlots: cleanSlots,
        sessionDurationMinutes: primarySessionDuration(templatesOut),
        sessionTemplates: templatesOut,
        maxStudents: bandMax,
        smartAutomationEnabled: true,
        maxSessionsPerWeek: maxSess,
        bufferMinutes: buf,
        bufferBetweenSessions: String(buf),
        autoAcceptSessionRequests: true,
        blockedDates,
        extraAvailabilitySlots,
        acceptingNewMentees,
        weeklyIntervalBands: {},
      };
    }

    const weeklySlots = weeklySlotsFromRows(weeklyRows);
    if (kind === "weekends") {
      for (const k of WEEKDAY_KEYS) {
        if (k !== "sat" && k !== "sun") weeklySlots[k] = [];
      }
    }
    const stored = mergeAvailability(initialJson);
    const anchorIsoFifteen =
      kind === "fifteen_days"
        ? stored.biweeklyAnchorIso &&
          jsWeekdayFromIsoLocal(stored.biweeklyAnchorIso) === recurringWeekdayJs
          ? stored.biweeklyAnchorIso
          : defaultBiweeklyAnchorFromTodayIso(todayIsoInBookingTz(), recurringWeekdayJs)
        : null;
    return {
      ...base,
      availabilityType: "weekly",
      availabilityWindowKind: kind,
      menteeCapacityBand,
      planningHorizonDays,
      weeklySlots:
        kind === "fifteen_days" || kind === "monthly" ? emptyWeeklySlots() : weeklySlots,
      specificDates: [],
      specificDateSlots: {},
      recurringWeekdayJs: kind === "fifteen_days" || kind === "monthly" ? recurringWeekdayJs : null,
      patternSlotLabels: kind === "fifteen_days" || kind === "monthly" ? sortSlotLabels(patternSlotLabels) : [],
      biweeklyAnchorIso: anchorIsoFifteen,
      sessionDurationMinutes: primarySessionDuration(templatesOut),
      sessionTemplates: templatesOut,
      maxStudents: bandMax,
      smartAutomationEnabled: true,
      maxSessionsPerWeek: maxSess,
      bufferMinutes: buf,
      bufferBetweenSessions: String(buf),
      autoAcceptSessionRequests: true,
      blockedDates,
      extraAvailabilitySlots,
      acceptingNewMentees,
      weeklyIntervalBands:
        kind === "fifteen_days" || kind === "monthly" ? {} : weeklyIntervalBandsFromRows(weeklyRows),
    };
  };

  useEffect(() => {
    if (skipFirstAutoSave.current) {
      skipFirstAutoSave.current = false;
      return;
    }
    if (blockAutosaveRef.current || saveInFlightRef.current) return;
    let cancelled = false;
    autosaveTimerRef.current = window.setTimeout(async () => {
      try {
        setAutoSaveState("saving");
        const av = buildPayload();
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "mentor",
            mentorAvailabilityJson: av as unknown as Record<string, unknown>,
          }),
        });
        if (!res.ok) throw new Error("autosave");
        if (!cancelled) {
          setAutoSaveState("saved");
          window.setTimeout(() => {
            if (!cancelled) setAutoSaveState("idle");
          }, 2200);
        }
      } catch {
        if (!cancelled) setAutoSaveState("error");
      }
    }, 1100);
    return () => {
      cancelled = true;
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- autosavePayloadKey mirrors buildPayload inputs
  }, [autosavePayloadKey]);

  const save = async () => {
    if (saveInFlightRef.current) {
      return;
    }
    if (!validate()) return;
    saveInFlightRef.current = true;
    blockAutosaveRef.current = true;
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    setSaving(true);
    try {
      const av = buildPayload();
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "mentor",
          mentorAvailabilityJson: av as unknown as Record<string, unknown>,
          mentorOnboardingComplete: true,
        }),
      });
      if (!res.ok) throw new Error("save");
      setSavedBanner(true);
      window.setTimeout(() => setSavedBanner(false), 3000);
      router.refresh();
      router.push(mentorOnboardingComplete ? "/mentor" : "/mentor?welcome=1");
    } catch {
      window.alert("Could not save availability. Try again.");
    } finally {
      setSaving(false);
      saveInFlightRef.current = false;
      blockAutosaveRef.current = false;
    }
  };

  const saveLabel = mentorOnboardingComplete ? "Save Availability Settings" : "Complete Setup & View Profile";

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50/25 to-white pb-20">
      <MandatorySetupReminderModal
        open={mandatoryExitOpen}
        variant="mentor"
        onDismiss={() => setMandatoryExitOpen(false)}
      />
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-8 md:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0a0a0a] sm:text-3xl">
              {mentorOnboardingComplete ? "Manage Your Availability" : "Set Your Availability"}
            </h1>
            <p className="mt-1.5 text-sm text-neutral-600 sm:text-base">
              {mentorOnboardingComplete
                ? "Set when you’re available and optional date overrides."
                : "Last step: share when you’re typically free. You can refine this anytime after setup."}
            </p>
            <p className="mt-2 text-xs text-neutral-500" aria-live="polite">
              {autoSaveState === "saving" ? (
                <span>Saving draft…</span>
              ) : autoSaveState === "saved" ? (
                <span className="text-emerald-700">Draft saved</span>
              ) : autoSaveState === "error" ? (
                <span className="text-red-600">Could not auto-save — check your connection</span>
              ) : (
                <span>Changes save automatically as you edit</span>
              )}
            </p>
          </div>
          {mentorOnboardingComplete ? (
            <Link
              href="/mentor"
              className="inline-flex shrink-0 items-center gap-1.5 self-start text-sm font-medium text-neutral-700 transition hover:text-primary"
            >
              <IconArrowLeft className="size-4" />
              Back to Dashboard
            </Link>
          ) : (
            <Link
              href="/mentor/setup/3"
              className="inline-flex shrink-0 items-center gap-1.5 self-start text-sm font-medium text-neutral-700 transition hover:text-primary"
            >
              <IconArrowLeft className="size-4" />
              Back to profile setup
            </Link>
          )}
        </div>

        {savedBanner ? (
          <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
            Availability updated successfully.
          </p>
        ) : null}
        <div
          role="tablist"
          aria-label="Availability sections"
          className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-neutral-100/90 p-1"
        >
          {(
            [
              ["weekly", "Schedule *", IconCalendar],
              ["specific", "Date overrides", IconCalendarDays],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-center text-[11px] font-medium transition sm:text-[13px] ${
                tab === id
                  ? "bg-white text-[#0a0a0a] shadow-sm ring-1 ring-black/5"
                  : "text-neutral-600 hover:bg-white/60 hover:text-[#0a0a0a]"
              }`}
            >
              <Icon className="size-3.5 shrink-0 sm:size-4" />
              <span className="leading-tight">{label}</span>
            </button>
          ))}
        </div>

        {tab === "weekly" ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
            <div className="mb-6 border-b border-neutral-100 pb-5">
              <h2 className="text-lg font-bold text-[#0a0a0a]">
                Schedule {REQ}
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                Choose time ranges (preset bands). Use Date overrides for one-off changes.
              </p>
            </div>
            <MentorSchedulePanel
              kind={availabilityWindowKind}
              onKindChange={(k) => {
                setAvailabilityWindowKind(k);
                setError(null);
                if (k === "weekends") {
                  setWeeklyRows((prev) => {
                    const m = weeklySlotsFromRows(prev);
                    for (const key of WEEKDAY_KEYS) {
                      if (key !== "sat" && key !== "sun") m[key] = [];
                    }
                    return weeklyRowsFromSlotMap(m);
                  });
                }
                if (k === "fifteen_days" || k === "monthly") {
                  setWeeklyRows(weeklyRowsFromSlotMap(emptyWeeklySlots()));
                }
              }}
              weeklySlots={weeklySlotsPreview}
              onToggleWeeklySlot={toggleWeeklySlot}
              onClearWeekly={clearWeeklySlots}
              onClearWeeklyDay={clearWeeklyDay}
              weeklyTotal={scheduleSlotCount}
              calendarViewYear={calendarView.year}
              calendarViewMonth={calendarView.month}
              onCalendarPrev={onCalendarPrev}
              onCalendarNext={onCalendarNext}
              specificDatesSlots={specificDatesSlots}
              onToggleCalendarDate={toggleCalendarDate}
              onToggleCustomDatePreset={
                isCalendarScheduleMode(availabilityWindowKind) ? toggleCustomDatePreset : undefined
              }
              onToggleSharedCustomDatePreset={
                isCalendarScheduleMode(availabilityWindowKind) ? toggleSharedCustomDatePreset : undefined
              }
              onClearCalendarSelection={clearCalendarSelection}
              calendarSelectable={calendarSelectable}
              recurringWeekdayJs={recurringWeekdayJs}
              onRecurringWeekdayJs={setRecurringWeekdayJs}
              patternSlotLabels={patternSlotLabels}
              onTogglePatternPreset={togglePatternPreset}
              onClearPatternSlots={clearPatternSlots}
            />
            {availabilityWindowKind !== "custom" ? (
              <div className="mt-6 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
                <span className="text-lg" aria-hidden>
                  💡
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-emerald-950">Tip</h4>
                  <p className="mt-1 text-sm text-emerald-900/90">
                    {scheduleSlotCount} two-hour range{scheduleSlotCount === 1 ? "" : "s"} in your live pattern. Use Date
                    overrides for one-off changes.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "specific" ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6 border-b border-neutral-100 pb-5">
              <h2 className="text-lg font-bold text-[#0a0a0a]">Specific Date Overrides (optional)</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Block dates or add extra availability for specific days (works with weekly mode). Not required to save.
              </p>
            </div>
            <div className="space-y-4">
              {overrideRows.map((row, index) => (
                <div key={row.id} className="rounded-xl border border-neutral-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium text-neutral-500">Date</label>
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => {
                            const v = e.target.value;
                            setOverrideRows((prev) => {
                              const next = [...prev];
                              next[index] = { ...next[index], date: v };
                              return next;
                            });
                          }}
                          className={`${field} mt-1`}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-neutral-500">Type</label>
                        <select
                          value={row.kind}
                          onChange={(e) => {
                            const kind = e.target.value as OverrideRow["kind"];
                            setOverrideRows((prev) => {
                              const next = [...prev];
                              next[index] = { ...next[index], kind, ranges: kind === "blocked" ? [] : next[index].ranges };
                              return next;
                            });
                          }}
                          className={`${field} mt-1 appearance-none pr-9`}
                        >
                          <option value="extra">Extra Availability</option>
                          <option value="blocked">Unavailable</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOverrideRows((prev) => prev.filter((_, i) => i !== index))}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      aria-label="Remove override"
                    >
                      <IconTrash className="size-4" />
                    </button>
                  </div>
                  {row.kind === "blocked" ? (
                    <div className="mt-3">
                      <label className="text-xs font-medium text-neutral-500">Reason (Optional)</label>
                      <input
                        value={row.reason}
                        onChange={(e) => {
                          const v = e.target.value;
                          setOverrideRows((prev) => {
                            const next = [...prev];
                            next[index] = { ...next[index], reason: v };
                            return next;
                          });
                        }}
                        placeholder="e.g., Conference, Vacation"
                        className={`${field} mt-1`}
                      />
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-neutral-500">Time slots (HH:MM-HH:MM per line)</p>
                      {row.ranges.map((r, ri) => (
                        <div key={ri} className="flex items-center gap-2">
                          <input
                            value={r}
                            placeholder="17:00-17:30"
                            onChange={(e) => {
                              const v = e.target.value;
                              setOverrideRows((prev) => {
                                const next = [...prev];
                                const ranges = [...next[index].ranges];
                                ranges[ri] = v;
                                next[index] = { ...next[index], ranges };
                                return next;
                              });
                            }}
                            className={field}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setOverrideRows((prev) => {
                                const next = [...prev];
                                next[index] = {
                                  ...next[index],
                                  ranges: next[index].ranges.filter((_, i) => i !== ri),
                                };
                                return next;
                              })
                            }
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                          >
                            <IconTrash className="size-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setOverrideRows((prev) => {
                            const next = [...prev];
                            next[index] = { ...next[index], ranges: [...next[index].ranges, ""] };
                            return next;
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium"
                      >
                        <IconPlus className="size-4" />
                        Add Slot
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setOverrideRows((prev) => [...prev, newOverrideRow("extra")])}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 py-3 text-sm font-semibold"
              >
                <IconPlus className="size-4" />
                Add Date Override
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
          <button
            type="button"
            onClick={() =>
              mentorOnboardingComplete ? router.push("/mentor") : setMandatoryExitOpen(true)
            }
            className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 py-2.5 text-sm font-semibold text-[#0a0a0a] shadow-sm hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-primary/90 disabled:opacity-60"
          >
            <IconSave className="size-4" />
            {saving ? "Saving…" : saveLabel}
          </button>
        </div>
        {error ? <p className="mt-3 text-right text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}

function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19 12H5M11 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 7V5m8 2V5m-9 4h10M6 21h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCalendarDays({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 7V5m8 2V5m-9 4h10M6 21h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M8 14h2v2H8v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z" fill="currentColor" />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSave({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 4h9l3 3v13a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M8 4v4h8V7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
