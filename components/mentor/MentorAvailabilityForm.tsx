"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  defaultMentorAvailability,
  defaultSessionTemplates,
  emptyWeeklySlots,
  type BlockedDateEntry,
  type MentorAvailabilityJson,
  type SessionTemplateRow,
  type WeekdayKey,
  WEEKDAY_KEYS,
  WEEKDAY_LABELS,
} from "@/components/mentor/mentor-setup-constants";
import {
  compactRangesFromLabels,
  labelsFromCompactRanges,
  type DayIntervalRow,
  weeklyRowsFromSlotMap,
  weeklySlotsFromRows,
} from "@/lib/mentor-availability-slots";

type TabId = "automation" | "weekly" | "sessions" | "specific";

type OverrideRow = {
  id: string;
  date: string;
  kind: "extra" | "blocked";
  ranges: string[];
  reason: string;
};

const field =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-[#0a0a0a] shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

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
  if (typeof o.maxStudents === "number" && o.maxStudents >= 1 && o.maxStudents <= 20) {
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
  return d;
}

function totalWeeklySlots(weeklySlots: Record<WeekdayKey, string[]>): number {
  return WEEKDAY_KEYS.reduce((acc, k) => acc + weeklySlots[k].length, 0);
}

function primarySessionDuration(templates: SessionTemplateRow[]): 15 | 30 | 45 | 60 | 90 {
  const allowed = new Set([15, 30, 45, 60, 90]);
  const first = templates.find((t) => t.enabled);
  const d = first?.durationMinutes ?? 60;
  return allowed.has(d) ? (d as 15 | 30 | 45 | 60 | 90) : 60;
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

type Props = {
  initialJson: unknown;
  googleCalendarConnected: boolean;
  mentorOnboardingComplete: boolean;
};

export function MentorAvailabilityForm({
  initialJson,
  googleCalendarConnected,
  mentorOnboardingComplete,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const base = useMemo(() => mergeAvailability(initialJson), [initialJson]);

  const [tab, setTab] = useState<TabId>("automation");
  const [weeklyRows, setWeeklyRows] = useState<DayIntervalRow[]>(() => weeklyRowsFromSlotMap(base.weeklySlots));
  const [sessionTemplates, setSessionTemplates] = useState<SessionTemplateRow[]>(
    () => (base.sessionTemplates?.length ? base.sessionTemplates : defaultSessionTemplates()),
  );
  const [overrideRows, setOverrideRows] = useState<OverrideRow[]>(() => {
    const r = overridesFromAv(base);
    return r.length ? r : [];
  });

  const [smartAutomationEnabled, setSmartAutomationEnabled] = useState(
    () => base.smartAutomationEnabled ?? true,
  );
  const [maxSessionsPerWeek, setMaxSessionsPerWeek] = useState(
    () => String(base.maxSessionsPerWeek ?? 10),
  );
  const [bufferMinutesStr, setBufferMinutesStr] = useState(() =>
    String(base.bufferMinutes ?? (base.bufferBetweenSessions ? parseInt(base.bufferBetweenSessions, 10) || 15 : 15)),
  );
  const [maxCapacity, setMaxCapacity] = useState(() => String(base.maxStudents));
  const [acceptingNewMentees, setAcceptingNewMentees] = useState(
    () => base.acceptingNewMentees ?? true,
  );

  const [intervalClipboard, setIntervalClipboard] = useState<{ start: string; end: string }[] | null>(null);
  const [pasteHint, setPasteHint] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    const c = searchParams.get("calendar");
    if (c === "connected") window.alert("Google Calendar connected. You can sync your slots after saving.");
    if (c === "error")
      window.alert("Could not connect Google Calendar. Try again or check GOOGLE_CLIENT_* and redirect URI in Google Cloud.");
  }, [searchParams]);

  const weeklySlotsPreview = useMemo(() => weeklySlotsFromRows(weeklyRows), [weeklyRows]);
  const weeklyCount = useMemo(() => totalWeeklySlots(weeklySlotsPreview), [weeklySlotsPreview]);

  const currentMenteesDisplay = 8;
  const maxCapNum = Math.max(1, Math.min(20, Number(maxCapacity) || 10));
  const capacityPct = Math.min(100, Math.round((currentMenteesDisplay / maxCapNum) * 100));

  const toggleDay = (idx: number) => {
    setWeeklyRows((prev) => {
      const next = [...prev];
      const row = { ...next[idx] };
      row.enabled = !row.enabled;
      if (row.enabled && row.intervals.length === 0) {
        row.intervals = [{ start: "09:00", end: "17:00" }];
      }
      next[idx] = row;
      return next;
    });
    setError(null);
  };

  const addInterval = (idx: number) => {
    setWeeklyRows((prev) => {
      const next = [...prev];
      const row = { ...next[idx], intervals: [...next[idx].intervals, { start: "09:00", end: "17:00" }] };
      next[idx] = row;
      return next;
    });
  };

  const removeInterval = (dayIdx: number, intIdx: number) => {
    setWeeklyRows((prev) => {
      const next = [...prev];
      const row = { ...next[dayIdx], intervals: next[dayIdx].intervals.filter((_, i) => i !== intIdx) };
      if (row.intervals.length === 0 && row.enabled) row.intervals = [{ start: "09:00", end: "17:00" }];
      next[dayIdx] = row;
      return next;
    });
  };

  const setIntervalField = (dayIdx: number, intIdx: number, key: "start" | "end", value: string) => {
    setWeeklyRows((prev) => {
      const next = [...prev];
      const intervals = [...next[dayIdx].intervals];
      intervals[intIdx] = { ...intervals[intIdx], [key]: value };
      next[dayIdx] = { ...next[dayIdx], intervals };
      return next;
    });
  };

  const copyDayIntervals = (idx: number) => {
    const row = weeklyRows[idx];
    if (!row.enabled || row.intervals.length === 0) return;
    setIntervalClipboard(row.intervals.map((i) => ({ ...i })));
    setPasteHint(`Copied ${WEEKDAY_LABELS[row.key]}. Click “Paste” on another day.`);
    window.setTimeout(() => setPasteHint(null), 4000);
  };

  const pasteToDay = (idx: number) => {
    if (!intervalClipboard?.length) return;
    setWeeklyRows((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        enabled: true,
        intervals: intervalClipboard.map((i) => ({ ...i })),
      };
      return next;
    });
    setPasteHint(null);
  };

  const validate = (): boolean => {
    if (totalWeeklySlots(weeklySlotsFromRows(weeklyRows)) === 0) {
      setError("Add at least one weekly time window so students can book you.");
      setTab("weekly");
      return false;
    }
    setError(null);
    return true;
  };

  const buildPayload = (): MentorAvailabilityJson => {
    const weeklySlots = weeklySlotsFromRows(weeklyRows);
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
    const buf = Math.max(0, Math.min(240, Number(bufferMinutesStr) || 15));
    const maxSess = Math.max(1, Math.min(50, Number(maxSessionsPerWeek) || 10));
    return {
      ...base,
      availabilityType: "weekly",
      weeklySlots,
      specificDates: [],
      specificDateSlots: {},
      sessionDurationMinutes: primarySessionDuration(sessionTemplates),
      sessionTemplates,
      maxStudents: maxCapNum,
      smartAutomationEnabled,
      maxSessionsPerWeek: maxSess,
      bufferMinutes: buf,
      bufferBetweenSessions: String(buf),
      autoAcceptSessionRequests: smartAutomationEnabled,
      blockedDates,
      extraAvailabilitySlots,
      acceptingNewMentees,
    };
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const av = buildPayload();
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
    }
  };

  const syncGoogle = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as { error?: string; created?: number };
      if (!res.ok) {
        window.alert(j.error ?? "Sync failed.");
        return;
      }
      window.alert(`Synced ${j.created ?? 0} slot(s) to your Google Calendar.`);
    } catch {
      window.alert("Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  const cancelHref = mentorOnboardingComplete ? "/mentor" : "/mentor/setup/3";
  const saveLabel = mentorOnboardingComplete ? "Save Availability Settings" : "Complete Setup & View Profile";

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50/25 to-white pb-20">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0a0a0a] sm:text-3xl">
              Manage Your Availability
            </h1>
            <p className="mt-1.5 text-sm text-neutral-600 sm:text-base">
              Set your schedule once and let automation handle the rest
            </p>
          </div>
          <Link
            href="/mentor"
            className="inline-flex shrink-0 items-center gap-1.5 self-start text-sm font-medium text-neutral-700 transition hover:text-primary"
          >
            <IconArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        </div>

        {savedBanner ? (
          <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
            Availability updated successfully.
          </p>
        ) : null}
        {pasteHint ? (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950">
            {pasteHint}
          </p>
        ) : null}

        <div
          role="tablist"
          aria-label="Availability sections"
          className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-neutral-100/90 p-1 sm:grid-cols-4"
        >
          {(
            [
              ["automation", "Smart Automation", IconZap],
              ["weekly", "Weekly Schedule", IconCalendar],
              ["sessions", "Session Types", IconClock],
              ["specific", "Specific Dates", IconCalendarDays],
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

        {tab === "automation" ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.06] to-primary/10 p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-start gap-3">
                <IconZap className="mt-0.5 size-7 shrink-0 text-primary" />
                <div>
                  <h2 className="text-lg font-bold text-[#0a0a0a]">Smart Scheduling</h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Automatically surface open slots from your weekly schedule and preferences
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-[#0a0a0a]">Enable Auto-Scheduling</p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Use your weekly windows and capacity settings when students browse slots
                    </p>
                  </div>
                  <Toggle checked={smartAutomationEnabled} onChange={setSmartAutomationEnabled} />
                </div>
                {smartAutomationEnabled ? (
                  <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
                    <h3 className="text-sm font-semibold text-[#0a0a0a]">Automation Settings</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor="maxSessWeek" className="text-sm font-semibold text-[#0a0a0a]">
                          Max Sessions Per Week
                        </label>
                        <input
                          id="maxSessWeek"
                          type="number"
                          min={1}
                          max={50}
                          value={maxSessionsPerWeek}
                          onChange={(e) => setMaxSessionsPerWeek(e.target.value)}
                          className={field}
                        />
                        <p className="text-xs text-neutral-500">Limit total sessions to prevent burnout</p>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="bufferMin" className="text-sm font-semibold text-[#0a0a0a]">
                          Buffer Between Sessions (minutes)
                        </label>
                        <input
                          id="bufferMin"
                          type="number"
                          min={0}
                          max={240}
                          value={bufferMinutesStr}
                          onChange={(e) => setBufferMinutesStr(e.target.value)}
                          className={field}
                        />
                        <p className="text-xs text-neutral-500">Time to prepare between sessions</p>
                      </div>
                    </div>
                    <div className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50/90 p-4">
                      <IconInfo className="mt-0.5 size-5 shrink-0 text-sky-600" />
                      <div>
                        <h4 className="text-sm font-semibold text-sky-950">How Auto-Scheduling Works</h4>
                        <ul className="mt-2 space-y-1 text-sm text-sky-900/90">
                          <li>• Rolling availability is derived from your weekly schedule</li>
                          <li>• Booked sessions should be blocked when Calendar sync is on</li>
                          <li>• Buffer and capacity limits are stored with your profile</li>
                          <li>• Update this page any time — changes apply after save</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-neutral-500">Current Capacity</p>
                <p className="mt-1 text-2xl font-bold text-[#0a0a0a]">
                  {currentMenteesDisplay} / {maxCapNum}
                </p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${capacityPct}%` }} />
                </div>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-neutral-500">This Week&apos;s Sessions</p>
                <p className="mt-1 text-2xl font-bold text-[#0a0a0a]">2 Booked</p>
                <p className="mt-2 text-sm text-neutral-600">Sample summary — wire to bookings when ready</p>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-neutral-500">Next Available</p>
                <p className="mt-1 text-2xl font-bold text-[#0a0a0a]">—</p>
                <p className="mt-2 text-sm text-neutral-600">Based on your saved weekly slots</p>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "weekly" ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6 border-b border-neutral-100 pb-5">
              <h2 className="text-lg font-bold text-[#0a0a0a]">Weekly Recurring Schedule</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Set your typical weekly availability. Half-hour steps align with booking.
              </p>
            </div>
            <div className="space-y-4">
              {weeklyRows.map((row, dayIdx) => (
                <div key={row.key} className="rounded-xl border border-neutral-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Toggle checked={row.enabled} onChange={() => toggleDay(dayIdx)} />
                      <span className="text-sm font-semibold text-[#0a0a0a]">{WEEKDAY_LABELS[row.key]}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {row.enabled && row.intervals.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => copyDayIntervals(dayIdx)}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          <IconCopy className="size-4" />
                          Copy
                        </button>
                      ) : null}
                      {intervalClipboard?.length ? (
                        <button
                          type="button"
                          onClick={() => pasteToDay(dayIdx)}
                          className="text-sm font-medium text-neutral-600 hover:text-primary hover:underline"
                        >
                          Paste
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {row.enabled ? (
                    <div className="ml-0 mt-3 space-y-2 sm:ml-11">
                      {row.intervals.map((intv, intIdx) => (
                        <div key={intIdx} className="flex flex-wrap items-center gap-2">
                          <input
                            type="time"
                            value={intv.start}
                            onChange={(e) => setIntervalField(dayIdx, intIdx, "start", e.target.value)}
                            className={`${field} w-[8.5rem]`}
                          />
                          <span className="text-sm text-neutral-500">to</span>
                          <input
                            type="time"
                            value={intv.end}
                            onChange={(e) => setIntervalField(dayIdx, intIdx, "end", e.target.value)}
                            className={`${field} w-[8.5rem]`}
                          />
                          <button
                            type="button"
                            disabled={row.intervals.length <= 1}
                            onClick={() => removeInterval(dayIdx, intIdx)}
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-30"
                            aria-label="Remove time slot"
                          >
                            <IconTrash className="size-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addInterval(dayIdx)}
                        className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-[#0a0a0a] hover:bg-neutral-50"
                      >
                        <IconPlus className="size-4" />
                        Add Time Slot
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
              <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
                <span className="text-lg" aria-hidden>
                  💡
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-emerald-950">Pro Tip</h4>
                  <p className="mt-1 text-sm text-emerald-900/90">
                    Set your typical weekly hours once; use Specific Dates for one-off changes. {weeklyCount} half-hour
                    slot{weeklyCount === 1 ? "" : "s"} in your current week pattern.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "sessions" ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6 border-b border-neutral-100 pb-5">
              <h2 className="text-lg font-bold text-[#0a0a0a]">Session Types &amp; Duration</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Define the types of sessions you offer. The first enabled row sets the default slot length for calendar
                sync.
              </p>
            </div>
            <div className="space-y-4">
              {sessionTemplates.map((session, index) => (
                <div key={session.id} className="rounded-xl border border-neutral-200 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <Toggle
                      checked={session.enabled}
                      onChange={() => {
                        setSessionTemplates((prev) => {
                          const next = [...prev];
                          next[index] = { ...next[index], enabled: !next[index].enabled };
                          return next;
                        });
                      }}
                    />
                    <div className="grid flex-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-medium text-neutral-500">Session Name</label>
                        <input
                          value={session.name}
                          disabled={!session.enabled}
                          onChange={(e) => {
                            setSessionTemplates((prev) => {
                              const next = [...prev];
                              next[index] = { ...next[index], name: e.target.value };
                              return next;
                            });
                          }}
                          className={`${field} mt-1 ${!session.enabled ? "opacity-50" : ""}`}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-neutral-500">Duration (minutes)</label>
                        <input
                          type="number"
                          min={15}
                          max={180}
                          step={5}
                          value={session.durationMinutes}
                          disabled={!session.enabled}
                          onChange={(e) => {
                            setSessionTemplates((prev) => {
                              const next = [...prev];
                              next[index] = { ...next[index], durationMinutes: Number(e.target.value) || 30 };
                              return next;
                            });
                          }}
                          className={`${field} mt-1 ${!session.enabled ? "opacity-50" : ""}`}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSessionTemplates((prev) => prev.filter((_, i) => i !== index))}
                      className="self-start rounded-lg p-2 text-red-500 hover:bg-red-50 lg:self-center"
                      aria-label="Remove session type"
                    >
                      <IconTrash className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setSessionTemplates((prev) => [
                    ...prev,
                    {
                      id: `st-${Date.now()}`,
                      name: "New Session Type",
                      durationMinutes: 30,
                      enabled: true,
                    },
                  ])
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-3 text-sm font-semibold text-[#0a0a0a] hover:bg-neutral-50"
              >
                <IconPlus className="size-4" />
                Add Session Type
              </button>
            </div>
          </div>
        ) : null}

        {tab === "specific" ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6 border-b border-neutral-100 pb-5">
              <h2 className="text-lg font-bold text-[#0a0a0a]">Specific Date Overrides</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Block dates or add extra availability for specific days (works with weekly mode)
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

        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-4 border-b border-neutral-100 pb-4">
            <h2 className="text-lg font-bold text-[#0a0a0a]">Overall Capacity</h2>
            <p className="text-sm text-neutral-600">Manage your total mentee capacity</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="maxCap" className="text-sm font-semibold text-[#0a0a0a]">
                Maximum Total Mentees
              </label>
              <input
                id="maxCap"
                type="number"
                min={1}
                max={20}
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
                className={field}
              />
              <p className="text-xs text-neutral-500">Current: {currentMenteesDisplay} active mentees (sample)</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#0a0a0a]">Accepting New Mentees</p>
              <div className="flex items-center gap-3 pt-1">
                <Toggle checked={acceptingNewMentees} onChange={setAcceptingNewMentees} />
                <span className="text-sm text-neutral-600">Currently accepting new mentee requests</span>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <IconCalendar className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#0a0a0a]">Google Calendar</h2>
              <p className="text-xs text-neutral-600">Sync saved slots and reduce double bookings</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/api/calendar/google/authorize?returnTo=${encodeURIComponent("/mentor/availability")}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-medium hover:bg-neutral-50"
            >
              <GoogleGlyph className="size-5" />
              {googleCalendarConnected ? "Reconnect Google Calendar" : "Connect Google Calendar"}
            </Link>
            {googleCalendarConnected ? (
              <button
                type="button"
                disabled={syncing}
                onClick={() => void syncGoogle()}
                className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                {syncing ? "Syncing…" : "Sync slots to Calendar"}
              </button>
            ) : null}
          </div>
        </section>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
          <button
            type="button"
            onClick={() => router.push(cancelHref)}
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-[3.25rem] shrink-0 rounded-full transition ${checked ? "bg-primary" : "bg-neutral-300"}`}
    >
      <span
        className={`absolute top-1 size-6 rounded-full bg-white shadow transition ${checked ? "left-7" : "left-1"}`}
      />
    </button>
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

function IconZap({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
        stroke="currentColor"
        strokeWidth="1.5"
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

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconInfo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 10v6M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

function IconCopy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 16V6a2 2 0 012-2h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
