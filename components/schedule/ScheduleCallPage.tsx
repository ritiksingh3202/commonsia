"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BookingSuccessModal, type BookingSuccessPayload } from "@/components/schedule/BookingSuccessModal";
import { monthName, MENTOR_TIME_SLOTS_HALF } from "@/components/mentor/mentor-setup-constants";
import { formatNextAvailableSlotLine } from "@/lib/mentor-next-slot";
import { bookableWindowsFromSortedHalfHourStarts } from "@/lib/booking-availability-slots";
import { mergeAvailabilityForSlot } from "@/lib/mentor-availability-merge";
import {
  BOOKING_DISPLAY_TIMEZONES,
  type BookingDisplayTimeZoneId,
  formatSlotInterval,
  formatSlotIntervalWithZoneName,
} from "@/lib/schedule-display-tz";
import { todayYmdInScheduleTz, SCHEDULE_BOOKING_TIMEZONE } from "@/lib/schedule-today-ist";

const CREAM = "bg-[#FFF8F1]";
const WEEK_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
/** Poll schedule APIs while the tab is open — epoch + Redis rotate on mentor saves. */
const SLOT_POLL_MS = 20_000;
const MONTH_POLL_MS = 45_000;

export type ApiBookableSlot = {
  startLabel: string;
  startISO: string;
  endISO: string;
  rangeLabelIst: string;
};

type UiSlot = ApiBookableSlot;
type ApiMonthAvailability = { availableDays: number[] };

async function readScheduleJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error("Empty response from the schedule service. Try refreshing the page.");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.ok
        ? "Could not read schedule data (invalid JSON). Try refreshing the page."
        : `Schedule request failed (${res.status}). Try refreshing the page.`,
    );
  }
}

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

const SUMMARY_WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function formatLongDate(year: number, monthIndex: number, day: number): string {
  const wd = new Date(Date.UTC(year, monthIndex, day, 12, 0, 0)).getUTCDay();
  const weekday = SUMMARY_WEEKDAYS[wd] ?? "Day";
  const month = monthName(monthIndex);
  return `${weekday}, ${month} ${ordinal(day)}`;
}

function buildFallbackEveningRanges(): string[] {
  const h = MENTOR_TIME_SLOTS_HALF;
  const ranges: string[] = [];
  for (let i = 0; i < h.length - 1; i++) {
    ranges.push(`${h[i]} – ${h[i + 1]}`);
  }
  const eveningStart = ranges.findIndex((r) => r.startsWith("06:00 PM"));
  const sliceStart = eveningStart >= 0 ? eveningStart : Math.max(0, ranges.length - 8);
  return ranges.slice(sliceStart, sliceStart + 8);
}

function splitSlotRange(range: string): [string, string] | null {
  const parts = range.split(/\s*[\u2013-]\s*/).map((s) => s.trim());
  if (parts.length < 2) return null;
  return [parts[0], parts[1]];
}

function fallbackSlotsForDay(year: number, monthIndex: number, day: number): UiSlot[] {
  const ranges = buildFallbackEveningRanges();
  const starts = new Set<string>();
  for (const r of ranges) {
    const p = splitSlotRange(r);
    if (p) starts.add(p[0]);
  }
  return bookableWindowsFromSortedHalfHourStarts([...starts], year, monthIndex, day, 30);
}

export function ScheduleCallPage({
  mentorUserId = null,
  mentorDisplayName = null,
  mentorAvailabilityJson = null,
  initialHasPendingSessionRequest = false,
}: {
  mentorUserId?: string | null;
  mentorDisplayName?: string | null;
  mentorAvailabilityJson?: unknown;
  /** Server: this student already has a pending `BookingRequest` for this mentor. */
  initialHasPendingSessionRequest?: boolean;
}) {
  const router = useRouter();
  const { status, data: sessionData } = useSession();
  const postBookingRedirectRef = useRef<number | null>(null);
  const shouldRedirectToStudentAfterModalRef = useRef(false);
  const initialIst = useMemo(() => todayYmdInScheduleTz(), []);
  const [viewYear, setViewYear] = useState(initialIst.year);
  const [viewMonth, setViewMonth] = useState(initialIst.monthIndex);
  const [selectedDay, setSelectedDay] = useState(initialIst.day);

  const [displayTimeZone, setDisplayTimeZone] = useState<BookingDisplayTimeZoneId>("Asia/Kolkata");

  const sessionBookingMinutes = useMemo(() => {
    if (!mentorUserId) return 30;
    return mergeAvailabilityForSlot(mentorAvailabilityJson).sessionDurationMinutes;
  }, [mentorUserId, mentorAvailabilityJson]);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [booking, setBooking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<BookingSuccessPayload | null>(null);
  const [hasPendingSessionRequest, setHasPendingSessionRequest] = useState(initialHasPendingSessionRequest);

  useEffect(() => {
    setHasPendingSessionRequest(initialHasPendingSessionRequest);
  }, [mentorUserId, initialHasPendingSessionRequest]);

  const dismissBookingSuccess = useCallback(() => {
    if (postBookingRedirectRef.current != null) {
      window.clearTimeout(postBookingRedirectRef.current);
      postBookingRedirectRef.current = null;
    }
    const goStudent = shouldRedirectToStudentAfterModalRef.current;
    shouldRedirectToStudentAfterModalRef.current = false;
    setBookingSuccess(null);
    if (goStudent) router.push("/student");
  }, [router]);

  useEffect(() => {
    return () => {
      if (postBookingRedirectRef.current != null) {
        window.clearTimeout(postBookingRedirectRef.current);
      }
    };
  }, []);

  const [slots, setSlots] = useState<UiSlot[]>(() =>
    mentorUserId ? [] : fallbackSlotsForDay(initialIst.year, initialIst.monthIndex, initialIst.day),
  );
  const [slotsLoading, setSlotsLoading] = useState(Boolean(mentorUserId));
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [monthAvailableDays, setMonthAvailableDays] = useState<Set<number> | null>(null);
  const [monthLoading, setMonthLoading] = useState(Boolean(mentorUserId));
  const [monthError, setMonthError] = useState<string | null>(null);

  const dim = daysInMonth(viewYear, viewMonth);
  const displayDay = Math.min(selectedDay, dim);
  const startPad = startWeekday(viewYear, viewMonth);
  const cells: (number | null)[] = [...Array(startPad).fill(null)];
  for (let d = 1; d <= dim; d++) cells.push(d);

  const availabilitySummary = useMemo(
    () => (mentorAvailabilityJson != null ? formatNextAvailableSlotLine(mentorAvailabilityJson) : null),
    [mentorAvailabilityJson],
  );

  const loadMonthAvailability = useCallback(async () => {
    if (!mentorUserId) return;
    setMonthLoading(true);
    setMonthError(null);
    try {
      const u = new URL("/api/schedule/mentor-month-availability", window.location.origin);
      u.searchParams.set("mentorUserId", mentorUserId);
      u.searchParams.set("year", String(viewYear));
      u.searchParams.set("month", String(viewMonth));
      const res = await fetch(u.toString());
      const data = (await readScheduleJson(res)) as { error?: string } & Partial<ApiMonthAvailability>;
      if (!res.ok) throw new Error(data.error ?? "Could not load availability");
      const days = new Set(Array.isArray(data.availableDays) ? data.availableDays.filter((n) => Number.isInteger(n)) : []);
      setMonthAvailableDays(days);
    } catch (e) {
      setMonthError(e instanceof Error ? e.message : "Could not load availability");
      setMonthAvailableDays(new Set());
    } finally {
      setMonthLoading(false);
    }
  }, [mentorUserId, viewYear, viewMonth]);

  const loadMentorSlots = useCallback(async () => {
    if (!mentorUserId) return;
    setSlotsLoading(true);
    setSlotsError(null);
    try {
      const u = new URL("/api/schedule/mentor-slots", window.location.origin);
      u.searchParams.set("mentorUserId", mentorUserId);
      u.searchParams.set("year", String(viewYear));
      u.searchParams.set("month", String(viewMonth));
      u.searchParams.set("day", String(displayDay));
      const res = await fetch(u.toString());
      const data = (await readScheduleJson(res)) as { error?: string; slots?: ApiBookableSlot[] };
      if (!res.ok) throw new Error(data.error ?? "Could not load times");
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch (e) {
      setSlotsError(e instanceof Error ? e.message : "Could not load times");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [mentorUserId, viewYear, viewMonth, displayDay]);

  useEffect(() => {
    if (!mentorUserId) {
      setSlots(fallbackSlotsForDay(viewYear, viewMonth, displayDay));
      setSlotsLoading(false);
      setSlotsError(null);
      setMonthAvailableDays(null);
      setMonthLoading(false);
      setMonthError(null);
      return;
    }
    let cancelled = false;
    const run = () => {
      if (!cancelled) void loadMentorSlots();
    };
    void run();
    const t = setInterval(run, SLOT_POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [mentorUserId, viewYear, viewMonth, displayDay, loadMentorSlots]);

  useEffect(() => {
    if (!mentorUserId) return;
    const run = async () => {
      await loadMonthAvailability();
    };
    void run();
    const t = setInterval(() => void run(), MONTH_POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void run();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [mentorUserId, viewYear, viewMonth, loadMonthAvailability]);

  useEffect(() => {
    if (!mentorUserId) return;
    if (!monthAvailableDays) return;
    if (monthAvailableDays.size === 0) return;
    if (monthAvailableDays.has(displayDay)) return;
    const sorted = [...monthAvailableDays].sort((a, b) => a - b);
    const next = sorted.find((d) => d >= displayDay) ?? sorted[0];
    setSelectedDay(next);
  }, [mentorUserId, monthAvailableDays, displayDay]);

  useEffect(() => {
    setSelectedSlotIndex((i) => {
      if (slots.length === 0) return 0;
      return Math.min(i, slots.length - 1);
    });
  }, [slots.length]);

  useEffect(() => {
    if (!mentorUserId) return;
    if (slotsLoading) return;
    if (slots.length > 0) return;
    if (!monthAvailableDays || monthAvailableDays.size === 0) return;
    const sorted = [...monthAvailableDays].sort((a, b) => a - b);
    const next = sorted.find((d) => d > displayDay) ?? sorted[0];
    if (next && next !== displayDay) setSelectedDay(next);
  }, [mentorUserId, slotsLoading, slots.length, monthAvailableDays, displayDay]);

  const selected = slots[selectedSlotIndex];

  /** First session-length slice inside the chosen mentor band — matches DB + WhatsApp {{6}}. */
  const mentorRequestedSession =
    mentorUserId && selected
      ? {
          startISO: selected.startISO,
          endISO: new Date(new Date(selected.startISO).getTime() + sessionBookingMinutes * 60_000).toISOString(),
        }
      : null;

  const summaryDate = formatLongDate(viewYear, viewMonth, displayDay);
  const summaryTimePrimary =
    mentorRequestedSession != null
      ? formatSlotIntervalWithZoneName(
          mentorRequestedSession.startISO,
          mentorRequestedSession.endISO,
          displayTimeZone,
        )
      : selected
        ? formatSlotIntervalWithZoneName(selected.startISO, selected.endISO, displayTimeZone)
        : "Pick a time";
  const summaryTimeIstHint =
    mentorRequestedSession != null && displayTimeZone !== "Asia/Kolkata"
      ? `IST: ${formatSlotInterval(mentorRequestedSession.startISO, mentorRequestedSession.endISO, "Asia/Kolkata")}`
      : selected && displayTimeZone !== "Asia/Kolkata"
        ? `IST: ${formatSlotInterval(selected.startISO, selected.endISO, "Asia/Kolkata")}`
        : null;

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

  const dayIsSelectable = (day: number) => {
    if (!mentorUserId) return true;
    if (!monthAvailableDays) return false;
    return monthAvailableDays.has(day);
  };

  const scheduleCall = async () => {
    shouldRedirectToStudentAfterModalRef.current = false;
    if (postBookingRedirectRef.current != null) {
      window.clearTimeout(postBookingRedirectRef.current);
      postBookingRedirectRef.current = null;
    }
    setFeedback(null);
    if (status !== "authenticated") {
      const q = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/auth/login?callbackUrl=${encodeURIComponent(q)}`;
      return;
    }
    if (mentorUserId && slots.length === 0) {
      setFeedback("No open times on this day. Choose another date or ask the mentor to update availability.");
      return;
    }
    if (!selected) {
      setFeedback("Pick a time slot first.");
      return;
    }
    setBooking(true);
    try {
      /** Band from UI; API stores first session-length slice starting at band start (WhatsApp {{6}}). */
      const startISO = selected.startISO;
      const endISO = selected.endISO;

      if (mentorUserId) {
        const bookRes = await fetch("/api/booking-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mentorUserId,
            startISO,
            endISO,
            bookYear: viewYear,
            bookMonthIndex: viewMonth,
            bookDay: displayDay,
            startLabel: selected.startLabel,
            title: mentorDisplayName ? `Commonsia: Session with ${mentorDisplayName}` : undefined,
            description: "1:1 mentoring session requested from the booking page.",
          }),
        });
        const bookData = (await bookRes.json()) as { ok?: boolean; error?: string; message?: string };
        if (!bookRes.ok) {
          setFeedback(bookData.error ?? "Could not submit your booking request.");
          return;
        }
        setHasPendingSessionRequest(true);
        void router.refresh();
        shouldRedirectToStudentAfterModalRef.current = true;
        setBookingSuccess({
          mode: "request_submitted",
          dismissAfterMs: 2_400,
          dateLine: summaryDate,
          timeLine: summaryTimePrimary,
          istHint: summaryTimeIstHint,
          durationMin: sessionBookingMinutes,
          calendarSynced: false,
          meetLink: null,
          softMessage: bookData.message ?? null,
        });
        return;
      }

      const res = await fetch("/api/calendar/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startISO,
          endISO,
          title: mentorDisplayName ? `Commonsia: Session with ${mentorDisplayName}` : undefined,
          description: mentorDisplayName
            ? `Mentoring session via Commonsia with ${mentorDisplayName}.`
            : "Mentoring session via Commonsia.",
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        calendarSynced?: boolean;
        htmlLink?: string;
        meetLink?: string | null;
      };
      if (!res.ok) {
        setFeedback(data.error ?? "Could not complete booking.");
        return;
      }
      setBookingSuccess({
        dateLine: summaryDate,
        timeLine: summaryTimePrimary,
        istHint: summaryTimeIstHint,
        durationMin: sessionBookingMinutes,
        calendarSynced: Boolean(data.calendarSynced),
        meetLink: data.meetLink ?? null,
        softMessage: data.message ?? null,
      });
      {
        const role = sessionData?.user?.role;
        const dashboardHref = role === "mentor" ? "/mentor" : "/student";
        if (postBookingRedirectRef.current != null) window.clearTimeout(postBookingRedirectRef.current);
        postBookingRedirectRef.current = window.setTimeout(() => {
          postBookingRedirectRef.current = null;
          router.push(dashboardHref);
        }, 2400);
      }
    } catch {
      setFeedback("Something went wrong. Try again.");
    } finally {
      setBooking(false);
    }
  };

  const bookDisabled =
    booking ||
    (Boolean(mentorUserId) && hasPendingSessionRequest) ||
    (Boolean(mentorUserId) && (slotsLoading || slots.length === 0 || !selected));

  return (
    <div className="min-h-[min(100vh,900px)] bg-gradient-to-b from-white to-orange-50/20 pb-16 pt-4 sm:pt-6">
      <BookingSuccessModal
        open={bookingSuccess != null}
        payload={bookingSuccess}
        onClose={dismissBookingSuccess}
      />
      <div className="mx-auto max-w-[1200px] px-3 sm:px-5 md:px-6">
        <Link
          href="/mentors"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 transition hover:text-primary"
        >
          <IconChevronLeft className="size-4" />
          Back
        </Link>

        <div className="rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-xl sm:p-5 md:p-6 lg:p-8">
          <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,240px)_1fr_minmax(0,260px)] lg:items-start lg:gap-8 xl:gap-10">
            {/* Left — summary */}
            <aside className="order-3 flex flex-col gap-5 lg:order-1 lg:self-start">
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

              <div className={`space-y-3 rounded-2xl ${CREAM} p-4 ring-1 ring-orange-100/60`}>
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
                    <p className="text-xs text-neutral-500">{mentorUserId ? "Requested session" : "Time"}</p>
                    <p className="font-semibold text-[#0a0a0a]">{summaryTimePrimary}</p>
                    {summaryTimeIstHint ? (
                      <p className="mt-0.5 text-[11px] text-neutral-500">{summaryTimeIstHint}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <IconStopwatch className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-neutral-500">{mentorUserId ? "Session length" : "Duration"}</p>
                    <p className="font-semibold text-[#0a0a0a]">{sessionBookingMinutes} minutes</p>
                  </div>
                </div>
              </div>

              {feedback ? (
                <p className="text-center text-xs font-medium text-red-600 sm:text-sm" role="alert">
                  {feedback}
                </p>
              ) : null}
              {mentorUserId && hasPendingSessionRequest ? (
                <div className="space-y-2 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-3 text-left sm:px-4">
                  <p className="text-sm font-semibold text-[#0a0a0a]">Session requested</p>
                  <p className="text-[12px] leading-relaxed text-neutral-700 sm:text-[13px]">
                    We’ll update you by email if this mentor accepts your request. You can review pending requests from
                    your student profile.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={bookDisabled}
                  onClick={() => void scheduleCall()}
                  className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {booking
                    ? mentorUserId
                      ? "Sending…"
                      : "Booking…"
                    : mentorUserId
                      ? "Request this session"
                      : "Book a session"}
                </button>
              )}
            </aside>

            {/* Middle — calendar */}
            <section className="order-1 lg:order-2 lg:self-start">
              <h1 className="text-xl font-bold text-[#0a0a0a] sm:text-2xl">
                {mentorUserId
                  ? hasPendingSessionRequest
                    ? "Session requested"
                    : "Request a session"
                  : "Book a session"}
              </h1>

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
                        disabled={!dayIsSelectable(day)}
                        onClick={() => dayIsSelectable(day) && setSelectedDay(day)}
                        className={`aspect-square max-h-10 rounded-xl text-sm font-medium transition sm:max-h-11 ${
                          day === displayDay
                            ? "bg-primary text-white shadow-md"
                            : dayIsSelectable(day)
                              ? "bg-white text-[#0a0a0a] hover:bg-orange-50"
                              : "bg-white text-neutral-400 opacity-50"
                        } ${dayIsSelectable(day) ? "" : "cursor-not-allowed"}`}
                      >
                        {day}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {mentorUserId ? (
                <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-neutral-500 sm:text-xs">
                  <span>
                    {monthLoading ? "Checking availability…" : monthError ? monthError : "Only available dates are clickable."}
                  </span>
                  <button
                    type="button"
                    onClick={() => void loadMonthAvailability()}
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Refresh dates
                  </button>
                </div>
              ) : null}

              <div className="relative mt-4">
                <label className="sr-only" htmlFor="schedule-display-tz">
                  Display times in
                </label>
                <select
                  id="schedule-display-tz"
                  value={displayTimeZone}
                  onChange={(e) => setDisplayTimeZone(e.target.value as BookingDisplayTimeZoneId)}
                  className="flex w-full cursor-pointer appearance-none items-center justify-between gap-2 rounded-xl border-2 border-primary bg-white py-3 pl-4 pr-10 text-left text-sm font-medium text-[#0a0a0a] shadow-sm transition hover:bg-orange-50/50"
                >
                  {BOOKING_DISPLAY_TIMEZONES.map((z) => (
                    <option key={z.id} value={z.id}>
                      Show times in: {z.label}
                    </option>
                  ))}
                </select>
                <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-neutral-500" />
              </div>
              <p className="mt-2 text-[11px] leading-snug text-neutral-500">
                Booking is stored in {SCHEDULE_BOOKING_TIMEZONE.replace("_", " ")}; other zones are for display only.
              </p>
            </section>

            {/* Right — time slots */}
            <aside className="order-2 lg:order-3 lg:self-start">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-[#0a0a0a]">Pick a time</h2>
                {mentorUserId ? (
                  <button
                    type="button"
                    onClick={() => void loadMentorSlots()}
                    className="text-xs font-semibold text-primary underline-offset-2 hover:underline sm:text-sm"
                  >
                    Refresh
                  </button>
                ) : null}
              </div>

              {mentorUserId ? (
                <div className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-neutral-500">
                  <p>
                    Each row is when this mentor is available.{" "}
                    <span className="font-medium text-neutral-600">
                      Your request books the first {sessionBookingMinutes}-minute session
                    </span>{" "}
                    starting at that row&apos;s begin time (same time shown in WhatsApp and Calendar after they accept).
                  </p>
                  <p className="font-medium text-neutral-600">
                    Busy slots may overlap some bands — refresh if times look stale.
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
                  Connect from a mentor&apos;s profile to load their real availability. Sample windows below use a 30-minute
                  session length.
                </p>
              )}

              {slotsLoading && mentorUserId ? (
                <p className="mt-4 text-center text-sm text-neutral-500">Loading open times…</p>
              ) : null}
              {slotsError && mentorUserId && !slotsLoading ? (
                <p className="mt-4 text-center text-sm text-red-600" role="alert">
                  {slotsError}
                </p>
              ) : null}
              {!slotsLoading && mentorUserId && slots.length === 0 ? (
                <p className="mt-4 text-center text-sm leading-relaxed text-neutral-600">
                  No open times on this day. Try another date.
                </p>
              ) : null}

              <ul className="mt-4 space-y-2">
                {slots.map((slot, idx) => {
                  const selectedRow = idx === selectedSlotIndex;
                  const line = formatSlotIntervalWithZoneName(slot.startISO, slot.endISO, displayTimeZone);
                  const istSub =
                    displayTimeZone !== "Asia/Kolkata"
                      ? formatSlotInterval(slot.startISO, slot.endISO, "Asia/Kolkata")
                      : null;
                  return (
                    <li key={`${slot.startISO}-${idx}`}>
                      <button
                        type="button"
                        onClick={() => setSelectedSlotIndex(idx)}
                        className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition ${
                          selectedRow
                            ? "border-primary bg-primary text-white shadow-md"
                            : "border-neutral-200 bg-white text-[#0a0a0a] hover:border-neutral-300"
                        }`}
                      >
                        <span
                          className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                            selectedRow ? "border-white bg-white" : "border-neutral-300 bg-white"
                          }`}
                        >
                          {selectedRow ? <span className="size-2.5 rounded-full bg-primary" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block">{line}</span>
                          {istSub ? (
                            <span
                              className={`mt-0.5 block text-[11px] font-normal ${selectedRow ? "text-white/90" : "text-neutral-500"}`}
                            >
                              IST: {istSub}
                            </span>
                          ) : null}
                        </span>
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
