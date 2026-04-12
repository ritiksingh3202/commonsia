"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";

import { monthName, MENTOR_TIME_SLOTS_HALF } from "@/components/mentor/mentor-setup-constants";
import { formatNextAvailableSlotLine } from "@/lib/mentor-next-slot";
import { istSlotRangeToISO } from "@/lib/schedule-slot-ist";

const CREAM = "bg-[#FFF8F1]";
const WEEK_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type Guest = { id: string; initials: string; bg: string };

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function startWeekday(year: number, monthIndex: number): number {
  return new Date(year, monthIndex, 1).getDay();
}

function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

function formatLongDate(year: number, monthIndex: number, day: number): string {
  const d = new Date(year, monthIndex, day);
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = monthName(monthIndex);
  return `${weekday}, ${month} ${ordinal(day)}`;
}

/** Consecutive 30-minute ranges from half-hour slot labels. */
function build30MinuteRanges(): string[] {
  const h = MENTOR_TIME_SLOTS_HALF;
  const out: string[] = [];
  for (let i = 0; i < h.length - 1; i++) {
    out.push(`${h[i]} – ${h[i + 1]}`);
  }
  return out;
}

const SLOT_RANGES = build30MinuteRanges();
const EVENING_START_INDEX = SLOT_RANGES.findIndex((r) => r.startsWith("06:00 PM"));
const DEFAULT_SLOT_SLICE = EVENING_START_INDEX >= 0 ? EVENING_START_INDEX : Math.max(0, SLOT_RANGES.length - 8);

export function ScheduleCallPage({
  mentorUserId = null,
  mentorDisplayName = null,
  mentorAvailabilityJson = null,
}: {
  mentorUserId?: string | null;
  mentorDisplayName?: string | null;
  mentorAvailabilityJson?: unknown;
}) {
  const { status } = useSession();
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(2); // March 0-based
  const [selectedDay, setSelectedDay] = useState(18);

  const [guests, setGuests] = useState<Guest[]>([]);
  const [inviteInput, setInviteInput] = useState("");

  const [durationMin, setDurationMin] = useState<30 | 45 | 60>(30);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [booking, setBooking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const dim = daysInMonth(viewYear, viewMonth);
  const displayDay = Math.min(selectedDay, dim);
  const startPad = startWeekday(viewYear, viewMonth);
  const cells: (number | null)[] = [...Array(startPad).fill(null)];
  for (let d = 1; d <= dim; d++) cells.push(d);

  const visibleSlots = useMemo(() => {
    const slice = SLOT_RANGES.slice(DEFAULT_SLOT_SLICE, DEFAULT_SLOT_SLICE + 8);
    return slice.length ? slice : SLOT_RANGES.slice(0, 8);
  }, []);

  const availabilitySummary = useMemo(
    () => (mentorAvailabilityJson != null ? formatNextAvailableSlotLine(mentorAvailabilityJson) : null),
    [mentorAvailabilityJson],
  );

  const selectedRange = visibleSlots[selectedSlotIndex] ?? visibleSlots[0];
  const [startLabel, endLabel] = selectedRange.split("–").map((s) => s.trim());

  const summaryDate = formatLongDate(viewYear, viewMonth, displayDay);
  const summaryTime = `${startLabel} - ${endLabel} (IST)`;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const addGuest = () => {
    const name = inviteInput.trim();
    if (!name) return;
    const parts = name.split(/\s+/);
    const initials =
      parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
    const hues = [
      "bg-rose-200 text-rose-900",
      "bg-indigo-200 text-indigo-900",
      "bg-teal-200 text-teal-900",
      "bg-orange-200 text-orange-900",
    ];
    setGuests((g) => [
      ...g,
      { id: `g-${Date.now()}`, initials, bg: hues[g.length % hues.length] },
    ]);
    setInviteInput("");
  };

  const removeGuest = (id: string) => setGuests((g) => g.filter((x) => x.id !== id));

  const scheduleCall = async () => {
    setFeedback(null);
    if (status !== "authenticated") {
      const q = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/auth/login?callbackUrl=${encodeURIComponent(q)}`;
      return;
    }
    setBooking(true);
    try {
      const { startISO, endISO } = istSlotRangeToISO(
        viewYear,
        viewMonth,
        displayDay,
        startLabel,
        durationMin,
      );
      const res = await fetch("/api/calendar/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorUserId: mentorUserId ?? undefined,
          startISO,
          endISO,
          title: mentorDisplayName ? `Commonsia: Session with ${mentorDisplayName}` : undefined,
          description: mentorDisplayName
            ? `Mentoring session via Commonsia with ${mentorDisplayName}.`
            : "Mentoring session via Commonsia.",
          notifyAttendees: notifyEmail,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        calendarSynced?: boolean;
        htmlLink?: string;
      };
      if (!res.ok) {
        setFeedback(data.error ?? "Could not complete booking.");
        return;
      }
      const lines = [
        `Call scheduled:\n${summaryDate}`,
        summaryTime,
        `Duration: ${durationMin} minutes`,
        `Guests (UI): ${guests.length}`,
      ];
      if (data.calendarSynced) {
        lines.push(
          "Google Calendar: event added; invite/reminder emails sent when Google has addresses for attendees.",
        );
        if (data.htmlLink) lines.push(`Open: ${data.htmlLink}`);
      } else if (data.message) {
        lines.push(data.message);
      }
      window.alert(lines.join("\n"));
    } catch {
      setFeedback("Something went wrong. Try again.");
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="min-h-[min(100vh,900px)] bg-gradient-to-b from-white to-orange-50/20 pb-16 pt-4 sm:pt-6">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <Link
          href="/mentors"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 transition hover:text-primary"
        >
          <IconChevronLeft className="size-4" />
          Back
        </Link>

        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-xl sm:p-6 lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,260px)_1fr_minmax(0,280px)] lg:gap-10">
            {/* Left — invite & summary */}
            <aside className="order-3 flex flex-col gap-5 lg:order-1">
              {mentorDisplayName ? (
                <div className="space-y-2">
                  <p className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-medium text-[#0a0a0a] sm:text-sm">
                    Booking with <span className="text-primary">{mentorDisplayName}</span>
                  </p>
                  {availabilitySummary ? (
                    <p className="text-xs leading-snug text-neutral-600 sm:text-sm">{availabilitySummary}</p>
                  ) : null}
                </div>
              ) : null}
              <div>
                <h2 className="text-base font-bold text-[#0a0a0a]">Who needs to be invited?</h2>
                <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
                  Add guests to see when they are available.
                </p>
              </div>

              <div className="flex overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                <input
                  type="text"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  placeholder="Invite Someone"
                  className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGuest())}
                />
                <button
                  type="button"
                  onClick={addGuest}
                  className="shrink-0 bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                  Invite
                </button>
              </div>

              {guests.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {guests.map((g) => (
                    <div key={g.id} className="relative">
                      <div
                        className={`flex size-12 items-center justify-center rounded-full text-sm font-semibold ${g.bg}`}
                      >
                        {g.initials}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeGuest(g.id)}
                        className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-white shadow ring-2 ring-white"
                        aria-label={`Remove ${g.initials}`}
                      >
                        <IconX className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className={`mt-auto space-y-3 rounded-2xl ${CREAM} p-4 ring-1 ring-orange-100/60`}>
                <div className="flex items-start gap-3 text-sm">
                  <IconCalendar className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-neutral-500">Date</p>
                    <p className="font-semibold text-[#0a0a0a]">{summaryDate}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <IconClock className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-neutral-500">Time</p>
                    <p className="font-semibold text-[#0a0a0a]">{summaryTime}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <IconStopwatch className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-neutral-500">Duration</p>
                    <p className="font-semibold text-[#0a0a0a]">{durationMin} Minutes</p>
                  </div>
                </div>
              </div>

              {feedback ? (
                <p className="text-center text-xs font-medium text-red-600 sm:text-sm" role="alert">
                  {feedback}
                </p>
              ) : null}
              <button
                type="button"
                disabled={booking}
                onClick={() => void scheduleCall()}
                className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90 disabled:opacity-60"
              >
                {booking ? "Booking…" : "Book a session"}
              </button>
            </aside>

            {/* Middle — calendar */}
            <section className="order-1 lg:order-2">
              <h1 className="text-xl font-bold text-[#0a0a0a] sm:text-2xl">Book a session</h1>

              <div className="mt-5 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
                    aria-label="Previous month"
                  >
                    <IconChevronLeft className="size-5" />
                  </button>
                  <span className="text-center text-base font-semibold text-[#0a0a0a]">
                    {monthName(viewMonth)} {viewYear}
                  </span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
                    aria-label="Next month"
                  >
                    <IconChevronRight className="size-5" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-neutral-500 sm:text-xs">
                  {WEEK_HEADERS.map((d) => (
                    <div key={d} className="py-2">
                      {d}
                    </div>
                  ))}
                  {cells.map((day, i) =>
                    day === null ? (
                      <div key={`e-${i}`} />
                    ) : (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className={`aspect-square max-h-10 rounded-xl text-sm font-medium transition sm:max-h-11 ${
                          day === displayDay
                            ? "bg-primary text-white shadow-md"
                            : "text-[#0a0a0a] hover:bg-orange-50"
                        }`}
                      >
                        {day}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <button
                type="button"
                className="mt-4 flex w-full items-center justify-between gap-2 rounded-xl border-2 border-primary bg-white px-4 py-3 text-left text-sm font-medium text-[#0a0a0a] shadow-sm transition hover:bg-orange-50/50"
              >
                <span className="flex items-center gap-2">
                  <IconGlobe className="size-5 text-primary" />
                  Indian Standard Time (IST)
                </span>
                <IconChevronDown className="size-5 shrink-0 text-neutral-500" />
              </button>

              <label
                className={`mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl ${CREAM} px-4 py-3 ring-1 ring-orange-100/50`}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-[#0a0a0a]">
                  <IconBell className="size-5 text-primary" />
                  Notify Members on email
                </span>
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="size-5 cursor-pointer rounded border-neutral-300 accent-primary focus:ring-primary"
                />
              </label>
            </section>

            {/* Right — time slots */}
            <aside className="order-2 lg:order-3">
              <h2 className="text-base font-bold text-[#0a0a0a]">Pick a time</h2>

              <div className="relative mt-4">
                <select
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value) as 30 | 45 | 60)}
                  className="w-full appearance-none rounded-xl border-2 border-primary bg-white py-3 pl-4 pr-10 text-sm font-medium text-[#0a0a0a] outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value={30}>Duration: 30 Minutes</option>
                  <option value={45}>Duration: 45 Minutes</option>
                  <option value={60}>Duration: 60 Minutes</option>
                </select>
                <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-neutral-500" />
              </div>

              <p className="mt-2 text-[11px] text-neutral-500">
                Slot list shows 30-minute steps; longer durations can combine blocks in a future booking API.
              </p>

              <ul className="mt-4 space-y-2">
                {visibleSlots.map((range, idx) => {
                  const selected = idx === selectedSlotIndex;
                  return (
                    <li key={range}>
                      <button
                        type="button"
                        onClick={() => setSelectedSlotIndex(idx)}
                        className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition ${
                          selected
                            ? "border-primary bg-primary text-white shadow-md"
                            : "border-neutral-200 bg-white text-[#0a0a0a] hover:border-neutral-300"
                        }`}
                      >
                        <span
                          className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                            selected ? "border-white bg-white" : "border-neutral-300 bg-white"
                          }`}
                        >
                          {selected ? <span className="size-2.5 rounded-full bg-white" /> : null}
                        </span>
                        {range.replace("–", "-")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconStopwatch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 9v4l2 2M9 3h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 21H10M6 8a6 6 0 1112 0c0 7 3 7 3 7H3s3 0 3-7z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
