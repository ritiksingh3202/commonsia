"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { MentorCalendarPicker } from "@/components/mentor/MentorCalendarPicker";
import {
  defaultMentorAvailability,
  emptyWeeklySlots,
  type MentorAvailabilityJson,
  type WeekdayKey,
  MENTOR_TIME_SLOTS,
  MENTOR_TIME_SLOTS_HALF,
  WEEKDAY_KEYS,
  WEEKDAY_LABELS,
} from "@/components/mentor/mentor-setup-constants";

const card = "rounded-xl border border-black/[0.08] bg-white p-4 shadow-sm sm:p-5";
const label = "text-[13px] font-semibold text-[#0a0a0a]";
const sub = "text-[12px] text-[#6b7280]";

function mergeAvailability(raw: unknown): MentorAvailabilityJson {
  const d = defaultMentorAvailability();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Partial<MentorAvailabilityJson>;
  if (o.sessionDurationMinutes === 30 || o.sessionDurationMinutes === 45 || o.sessionDurationMinutes === 60 || o.sessionDurationMinutes === 90) {
    d.sessionDurationMinutes = o.sessionDurationMinutes;
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
  return d;
}

function totalWeeklySlots(weeklySlots: Record<WeekdayKey, string[]>): number {
  return WEEKDAY_KEYS.reduce((acc, k) => acc + weeklySlots[k].length, 0);
}

function totalSpecificSlots(specificDates: string[], specificDateSlots: Record<string, string[]>): number {
  return specificDates.reduce((acc, iso) => acc + (specificDateSlots[iso]?.length ?? 0), 0);
}

function formatIsoDateHeading(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

type Props = {
  initialJson: unknown;
  googleCalendarConnected: boolean;
};

export function MentorAvailabilityForm({ initialJson, googleCalendarConnected }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [av, setAv] = useState<MentorAvailabilityJson>(() => mergeAvailability(initialJson));
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const c = searchParams.get("calendar");
    if (c === "connected") window.alert("Google Calendar connected. You can sync your slots after saving.");
    if (c === "error") window.alert("Could not connect Google Calendar. Try again or check AUTH_GOOGLE_* and redirect URI in Google Cloud.");
  }, [searchParams]);

  const weeklyCount = useMemo(() => totalWeeklySlots(av.weeklySlots), [av.weeklySlots]);
  const specificCount = useMemo(
    () => totalSpecificSlots(av.specificDates, av.specificDateSlots),
    [av.specificDates, av.specificDateSlots],
  );

  const toggleSlot = (day: WeekdayKey, slot: string) => {
    setAv((prev) => {
      const list = prev.weeklySlots[day];
      const has = list.includes(slot);
      return {
        ...prev,
        weeklySlots: {
          ...prev.weeklySlots,
          [day]: has ? list.filter((s) => s !== slot) : [...list, slot],
        },
      };
    });
    setError(null);
  };

  const toggleSpecificSlot = (iso: string, slot: string) => {
    setAv((prev) => {
      const list = prev.specificDateSlots[iso] ?? [];
      const has = list.includes(slot);
      return {
        ...prev,
        specificDateSlots: {
          ...prev.specificDateSlots,
          [iso]: has ? list.filter((s) => s !== slot) : [...list, slot].sort(),
        },
      };
    });
    setError(null);
  };

  const toggleDate = (iso: string) => {
    setAv((prev) => {
      const has = prev.specificDates.includes(iso);
      const nextDates = has ? prev.specificDates.filter((d) => d !== iso) : [...prev.specificDates, iso].sort();
      const nextSlots = { ...prev.specificDateSlots };
      if (has) delete nextSlots[iso];
      else nextSlots[iso] = [];
      return { ...prev, specificDates: nextDates, specificDateSlots: nextSlots };
    });
    setError(null);
  };

  const clearDatesInMonth = (year: number, monthIndex: number) => {
    setAv((prev) => {
      const nextDates = prev.specificDates.filter((iso) => {
        const [y, m] = iso.split("-").map(Number);
        return !(y === year && m - 1 === monthIndex);
      });
      const nextSlots = { ...prev.specificDateSlots };
      for (const iso of prev.specificDates) {
        const [y, m] = iso.split("-").map(Number);
        if (y === year && m - 1 === monthIndex) delete nextSlots[iso];
      }
      return { ...prev, specificDates: nextDates, specificDateSlots: nextSlots };
    });
  };

  const validate = (): boolean => {
    if (av.availabilityType === "weekly") {
      if (weeklyCount === 0) {
        setError("Please select at least one time slot to continue.");
        return false;
      }
    } else {
      if (av.specificDates.length === 0) {
        setError("Please select at least one date, or switch to recurring weekly availability.");
        return false;
      }
      for (const iso of av.specificDates) {
        if ((av.specificDateSlots[iso] ?? []).length === 0) {
          setError("Choose time slots for each selected date (sections below the calendar).");
          return false;
        }
      }
    }
    setError(null);
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorAvailabilityJson: av as unknown as Record<string, unknown>,
          mentorOnboardingComplete: true,
        }),
      });
      if (!res.ok) throw new Error("save");
      router.push("/mentor");
      router.refresh();
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

  const selectedSet = useMemo(() => new Set(av.specificDates), [av.specificDates]);

  return (
    <div className="mx-auto max-w-[640px] px-4 pb-16 pt-6 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="font-heading text-xl font-semibold tracking-tight text-[#0a0a0a] sm:text-2xl">
          Set Your Availability
        </h1>
        <p className="mt-2 text-[13px] text-[#6b7280] sm:text-sm">
          Configure when and how students can book sessions with you.
        </p>
      </div>

      <div className="space-y-5">
        <section className={card}>
          <div className="mb-3 flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CalendarIcon className="size-5" />
            </span>
            <div>
              <h2 className={label}>Connect Google Calendar</h2>
              <p className={`${sub} mt-0.5`}>Sync your availability and prevent double bookings.</p>
            </div>
          </div>
          <div className="rounded-lg border border-sky-200/80 bg-sky-50/90 px-3 py-2.5 text-[12px] leading-relaxed text-sky-950 sm:text-[13px]">
            <p className="font-semibold text-sky-950">Benefits of connecting</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-sky-900/95">
              <li>Automatic sync with your existing calendar</li>
              <li>Prevent scheduling conflicts</li>
              <li>Reminders for upcoming sessions</li>
              <li>Push your Commonsia slots to Google Calendar</li>
            </ul>
          </div>
          <p className="mt-2 text-[11px] text-[#9ca3af]">
            Add redirect URI in Google Cloud:{" "}
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-[10px]">
              …/api/calendar/google/callback
            </code>
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/api/calendar/google/authorize"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/10 bg-white py-2.5 text-[13px] font-medium text-[#0a0a0a] shadow-sm hover:bg-neutral-50"
            >
              <GoogleGlyph className="size-5" />
              {googleCalendarConnected ? "Reconnect Google Calendar" : "Connect Google Calendar"}
            </Link>
            {googleCalendarConnected ? (
              <button
                type="button"
                disabled={syncing}
                onClick={() => void syncGoogle()}
                className="w-full rounded-lg bg-neutral-900 py-2.5 text-[13px] font-semibold text-white hover:bg-neutral-800 disabled:opacity-60 sm:w-auto sm:px-4"
              >
                {syncing ? "Syncing…" : "Sync slots to Calendar"}
              </button>
            ) : null}
          </div>
        </section>

        <section className={card}>
          <div className="mb-3 flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ClockIcon className="size-5" />
            </span>
            <div>
              <h2 className={label}>Session Duration</h2>
              <p className={`${sub} mt-0.5`}>How long will each mentoring session be?</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([30, 45, 60, 90] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setAv((p) => ({ ...p, sessionDurationMinutes: m }))}
                className={`rounded-xl border py-3 text-center text-[13px] font-semibold transition ${
                  av.sessionDurationMinutes === m
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/25"
                    : "border-black/[0.08] bg-white text-[#0a0a0a] hover:border-neutral-300"
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-[#9ca3af]">
            Recommended: 60-minute sessions are ideal for in-depth discussions and portfolio reviews.
          </p>
        </section>

        <section className={card}>
          <div className="mb-3 flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CalendarIcon className="size-5" />
            </span>
            <div>
              <h2 className={label}>Availability Type</h2>
              <p className={`${sub} mt-0.5`}>Choose how you want to set your availability</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setAv((p) => ({ ...p, availabilityType: "weekly" }));
                setError(null);
              }}
              className={`rounded-xl border p-4 text-left transition ${
                av.availabilityType === "weekly"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/25"
                  : "border-black/[0.08] hover:border-neutral-300"
              }`}
            >
              <p className="text-[13px] font-semibold text-[#0a0a0a]">Recurring Weekly</p>
              <p className="mt-1 text-[12px] leading-snug text-[#6b7280]">
                Set time slots that repeat every week (e.g., every Monday at 10:00).
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setAv((p) => ({ ...p, availabilityType: "specific" }));
                setError(null);
              }}
              className={`rounded-xl border p-4 text-left transition ${
                av.availabilityType === "specific"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/25"
                  : "border-black/[0.08] hover:border-neutral-300"
              }`}
            >
              <p className="text-[13px] font-semibold text-[#0a0a0a]">Specific Dates</p>
              <p className="mt-1 text-[12px] leading-snug text-[#6b7280]">
                Pick dates on the calendar, then choose time slots for each date below.
              </p>
            </button>
          </div>
        </section>

        {av.availabilityType === "specific" ? (
          <section className={card}>
            <div className="mb-3 flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CalendarIcon className="size-5" />
              </span>
              <div>
                <h2 className={label}>Select Specific Dates</h2>
                <p className={`${sub} mt-0.5`}>Use Year and Month to navigate, then tap dates to select.</p>
              </div>
            </div>
            <MentorCalendarPicker
              selected={selectedSet}
              onToggleDate={toggleDate}
              onClearDatesInMonth={clearDatesInMonth}
            />
          </section>
        ) : null}

        {av.availabilityType === "specific" && av.specificDates.length > 0 ? (
          <section className={card}>
            <div className="mb-3 flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ClockIcon className="size-5" />
              </span>
              <div>
                <h2 className={label}>Time slots for each selected date</h2>
                <p className={`${sub} mt-0.5`}>
                  {specificCount} slot{specificCount === 1 ? "" : "s"} selected · 30-minute increments
                </p>
              </div>
            </div>
            <div className="space-y-5">
              {av.specificDates.map((iso) => (
                <div key={iso} className="rounded-xl border border-black/[0.06] bg-neutral-50/50 p-3 sm:p-4">
                  <p className="mb-2 text-[13px] font-semibold text-[#0a0a0a]">{formatIsoDateHeading(iso)}</p>
                  <p className="mb-2 text-[11px] text-[#9ca3af]">{iso}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MENTOR_TIME_SLOTS_HALF.map((slot) => {
                      const on = (av.specificDateSlots[iso] ?? []).includes(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => toggleSpecificSlot(iso, slot)}
                          className={`rounded-lg border px-2 py-1.5 text-[10px] font-medium transition sm:text-[11px] ${
                            on
                              ? "border-primary bg-primary text-white shadow-sm"
                              : "border-black/[0.08] bg-white text-[#0a0a0a] hover:border-neutral-300"
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {av.availabilityType === "weekly" ? (
          <section className={card}>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ClockIcon className="size-5" />
                </span>
                <div>
                  <h2 className={label}>Select Your Available Time Slots</h2>
                  <p className={`${sub} mt-0.5`}>
                    {weeklyCount} time slot{weeklyCount === 1 ? "" : "s"} selected across the week
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setAv((p) => ({
                    ...p,
                    weeklySlots: emptyWeeklySlots(),
                  }))
                }
                className="text-[13px] font-medium text-primary hover:underline"
              >
                Clear all
              </button>
            </div>
            <div className="space-y-4">
              {WEEKDAY_KEYS.map((day) => (
                <div key={day} className="border-b border-black/[0.06] pb-4 last:border-0 last:pb-0">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-[#0a0a0a]">{WEEKDAY_LABELS[day]}</span>
                    <span className="text-[12px] text-[#9ca3af]">{av.weeklySlots[day].length} slots</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {MENTOR_TIME_SLOTS.map((slot) => {
                      const on = av.weeklySlots[day].includes(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => toggleSlot(day, slot)}
                          className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition sm:text-[12px] ${
                            on
                              ? "border-primary bg-primary text-white shadow-sm"
                              : "border-black/[0.08] bg-white text-[#0a0a0a] hover:border-neutral-300"
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className={card}>
          <div className="mb-3 flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UsersIcon className="size-5" />
            </span>
            <div>
              <h2 className={label}>Student Capacity</h2>
              <p className={`${sub} mt-0.5`}>How many students do you want to mentor?</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[13px] font-medium text-[#0a0a0a]">Maximum Number of Students</span>
            <span className="text-lg font-semibold text-primary tabular-nums">{av.maxStudents}</span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={av.maxStudents}
            onChange={(e) => setAv((p) => ({ ...p, maxStudents: Number(e.target.value) }))}
            className="mt-3 h-2 w-full cursor-pointer accent-primary"
          />
          <div className="mt-1 flex justify-between text-[11px] text-[#9ca3af]">
            <span>1 student</span>
            <span>20 students</span>
          </div>
          <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-[12px] text-[#6b7280]">
            We recommend starting with 3–5 students to maintain quality mentorship while building experience on the platform.
          </p>
        </section>

        <section className={card}>
          <div className="mb-3 flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BoltIcon className="size-5" />
            </span>
            <div>
              <h2 className={label}>Smart Automation</h2>
              <p className={`${sub} mt-0.5`}>Optional scheduling preferences</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] py-3">
            <span className="text-[13px] text-[#0a0a0a]">Auto-accept session requests</span>
            <button
              type="button"
              role="switch"
              aria-checked={av.autoAcceptSessionRequests ?? false}
              onClick={() =>
                setAv((p) => ({
                  ...p,
                  autoAcceptSessionRequests: !p.autoAcceptSessionRequests,
                }))
              }
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                av.autoAcceptSessionRequests ? "bg-primary" : "bg-neutral-300"
              }`}
            >
              <span
                className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition ${
                  av.autoAcceptSessionRequests ? "left-6" : "left-0.5"
                }`}
              />
            </button>
          </div>
          <div className="space-y-3 pt-3">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-[#0a0a0a]">Buffer time between sessions</label>
              <input
                type="text"
                value={av.bufferBetweenSessions ?? ""}
                onChange={(e) => setAv((p) => ({ ...p, bufferBetweenSessions: e.target.value }))}
                placeholder="e.g. 15 minutes"
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              <p className="mt-1 text-[12px] text-[#9ca3af]">Time to rest and prepare between mentoring sessions.</p>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-[#0a0a0a]">Advance booking window</label>
              <input
                type="text"
                value={av.advanceBookingWindow ?? ""}
                onChange={(e) => setAv((p) => ({ ...p, advanceBookingWindow: e.target.value }))}
                placeholder="e.g. 2 weeks"
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              <p className="mt-1 text-[12px] text-[#9ca3af]">How far ahead students can book sessions with you.</p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/mentor/setup/3")}
          className="rounded-lg border border-black/10 bg-white px-5 py-2.5 text-[13px] font-medium text-[#0a0a0a] hover:bg-neutral-50"
        >
          Back to Profile
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-lg bg-primary px-6 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Complete Setup & View Profile"}
        </button>
      </div>
      {error ? <p className="mt-3 text-center text-[13px] text-red-600 sm:text-right">{error}</p> : null}
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
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

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
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
