"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatBookingRangeDisplay } from "@/lib/booking-datetime-display";
import type { SessionWithMentorPayload } from "@/lib/student-session-with-mentor-types";

const POLL_MS_HAS_MEET = 14_000;
const POLL_MS_WAITING_MEET = 5_000;

function initials(name: string | null | undefined): string {
  const n = name?.trim();
  if (!n) return "?";
  return n
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UpcomingSessionScreen({
  mentorId,
  initial,
}: {
  mentorId: string;
  initial: SessionWithMentorPayload;
}) {
  const [data, setData] = useState<SessionWithMentorPayload>(initial);

  const refresh = useCallback(async () => {
    try {
      const u = new URL("/api/student/session-with-mentor", window.location.origin);
      u.searchParams.set("mentorUserId", mentorId);
      const r = await fetch(u.toString(), { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as SessionWithMentorPayload;
      setData(j);
    } catch {
      /* ignore */
    }
  }, [mentorId]);

  const booking = data.booking;
  const meet = booking?.googleMeetLink?.trim() ?? "";

  const pollMs = useMemo(
    () => (booking && !meet ? POLL_MS_WAITING_MEET : POLL_MS_HAS_MEET),
    [booking, meet],
  );

  useEffect(() => {
    const t0 = window.setTimeout(() => void refresh(), 0);
    const id = window.setInterval(() => void refresh(), pollMs);
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh, pollMs]);

  const mentorName = data.mentor.name?.trim() || "Mentor";
  const studentName = data.student.name?.trim() || "You";

  const range =
    booking?.displayRange?.trim() ||
    (booking ? formatBookingRangeDisplay(booking.startAt, booking.endAt) : "");

  const joinBtnClass =
    "inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-semibold text-white shadow-md transition hover:bg-primary/90";

  return (
    <div className="min-h-[min(100vh,880px)] bg-gradient-to-b from-white to-orange-50/25 pb-16 pt-6 sm:pt-8">
      <div className="mx-auto max-w-lg px-4 sm:px-6">
        <Link
          href="/student"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 transition hover:text-primary"
        >
          <IconChevronLeft className="size-4" />
          Back to dashboard
        </Link>

        <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-xl sm:p-8">
          {!booking ? (
            <div className="text-center">
              <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
                <div className="rounded-full bg-neutral-100 p-4 text-neutral-500">
                  <IconCalendar className="size-10" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-[#0a0a0a]">No upcoming session</h1>
                  <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">
                    You don&apos;t have a scheduled session with {mentorName} yet. Book a time to get a Google Meet link
                    here.
                  </p>
                </div>
                <Link
                  href={`/schedule?mentorUserId=${encodeURIComponent(mentorId)}`}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white shadow-md transition hover:bg-primary/90 sm:w-auto sm:px-8"
                >
                  Book a session
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-primary">
                Session scheduled
              </p>
              <h1 className="mt-3 text-center text-xl font-bold text-[#0a0a0a] sm:text-2xl">
                {mentorName} & {studentName}
              </h1>
              <p className="mt-2 text-center text-[14px] text-neutral-600">
                Your mentoring session is on the calendar between you both.
              </p>

              <div className="mt-8 flex items-center justify-center gap-2 sm:gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex size-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary/30 bg-primary/5 shadow-sm sm:size-20">
                    {data.mentor.image?.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={data.mentor.image} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="text-lg font-semibold text-primary">{initials(data.mentor.name)}</span>
                    )}
                  </div>
                  <span className="max-w-[6.5rem] truncate text-center text-[12px] font-medium text-[#0a0a0a] sm:max-w-[7.5rem]">
                    {mentorName}
                  </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col items-center px-1">
                  <div className="flex w-full items-center gap-0">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/35" />
                    <div
                      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-[#FFF8F1] shadow-sm"
                      title="Video session"
                    >
                      <IconVideo className="size-5 text-primary" />
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/35" />
                  </div>
                  <span className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                    Meet
                  </span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="flex size-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-600/25 bg-emerald-50/80 shadow-sm sm:size-20">
                    {data.student.image?.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={data.student.image} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="text-lg font-semibold text-emerald-800">{initials(data.student.name)}</span>
                    )}
                  </div>
                  <span className="max-w-[6.5rem] truncate text-center text-[12px] font-medium text-[#0a0a0a] sm:max-w-[7.5rem]">
                    {studentName}
                  </span>
                </div>
              </div>

              {range ? (
                <p className="mt-8 rounded-xl border border-black/[0.06] bg-neutral-50/90 px-4 py-3 text-center text-[14px] font-medium text-neutral-800">
                  {range}
                </p>
              ) : null}

              <div className="mt-6 flex flex-col gap-3">
                {meet ? (
                  <a href={meet} target="_blank" rel="noopener noreferrer" className={joinBtnClass}>
                    Join the session
                  </a>
                ) : (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50/90 px-4 py-3 text-center">
                    <p className="text-[13px] font-medium text-[#0a0a0a]">Google Meet link not in Commonsia yet</p>
                    <p className="mt-1.5 text-[12px] leading-snug text-neutral-600">
                      Open the calendar invite in your email—it usually includes the Meet link. If you just finished
                      booking, tap refresh—we check every few seconds until it appears.
                    </p>
                    <button
                      type="button"
                      onClick={() => void refresh()}
                      className="mt-3 inline-flex h-10 items-center justify-center rounded-lg border border-primary/30 bg-white px-4 text-[13px] font-semibold text-primary transition hover:bg-primary/5"
                    >
                      Check for Meet link
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-8 border-t border-black/[0.06] pt-6">
                <p className="text-center text-[12px] text-neutral-500">Need another time?</p>
                <Link
                  href={`/schedule?mentorUserId=${encodeURIComponent(mentorId)}`}
                  className="mt-2 flex h-10 w-full items-center justify-center rounded-lg border border-black/[0.1] bg-white text-[13px] font-medium text-[#0a0a0a] transition hover:bg-neutral-50"
                >
                  Open booking calendar
                </Link>
              </div>
            </>
          )}
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

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 7V5m8 2V5m-9 8h10M6 21h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconVideo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 10l4-3v10l-4-3v-4zM4 8h9a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
