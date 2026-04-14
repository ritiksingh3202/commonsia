"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { GoogleCalendarRequiredModal } from "@/components/onboarding/GoogleCalendarRequiredModal";
import { ProfileCompletionWelcome } from "@/components/onboarding/ProfileCompletionWelcome";
import { StudentProfileHero } from "@/components/student/StudentProfileHero";
import type { StudentProfileUser } from "@/components/student/student-profile-types";
import { formatSessionStartDisplay } from "@/lib/booking-datetime-display";
import type { StudentDashboardPayload } from "@/lib/student-dashboard-data";

const POLL_MS = 45_000;

const recommendations: { title: string; meta: string; href: string; cta: string }[] = [
  {
    title: "Join the discussion",
    meta: "Community • Ask questions and meet peers on Contact",
    href: "/contact",
    cta: "Open",
  },
  {
    title: "Browse upcoming opportunities",
    meta: "Events & workshops • Stay in the loop via Who We Are",
    href: "/#who-we-are",
    cta: "Explore",
  },
  {
    title: "Find your next mentor",
    meta: "Mentors • Match by skills, software, and focus areas",
    href: "/mentors",
    cta: "Browse",
  },
];

const card =
  "rounded-xl border border-black/[0.07] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]";
const sectionTitle = "text-[15px] font-semibold leading-snug text-[#0a0a0a]";
const sectionDesc = "mt-1 text-[13px] leading-snug text-[#6b7280]";
const rowBtn =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-md px-4 text-[13px] font-medium transition-colors sm:min-w-[5.5rem]";

function StudentJoinSessionButton({
  googleMeetLink,
  reloadDashboard,
  className,
}: {
  googleMeetLink: string | null | undefined;
  reloadDashboard: () => Promise<void>;
  className: string;
}) {
  const [busy, setBusy] = useState(false);
  const url = googleMeetLink?.trim() ?? "";
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
        Join session
      </a>
    );
  }
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={() => {
        void (async () => {
          setBusy(true);
          try {
            await reloadDashboard();
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      {busy ? "Checking…" : "Join session"}
    </button>
  );
}

function initialsFromName(name: string | null | undefined): string {
  const n = name?.trim();
  if (!n) return "?";
  return n
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function StudentDashboard({
  user,
  initialDashboard,
  googleCalendarConnected,
}: {
  user: StudentProfileUser;
  initialDashboard: StudentDashboardPayload;
  googleCalendarConnected: boolean;
}) {
  const [data, setData] = useState(initialDashboard);
  const loadQueueRef = useRef(Promise.resolve());

  const load = useCallback(async () => {
    loadQueueRef.current = loadQueueRef.current.then(async () => {
      try {
        const r = await fetch("/api/student/dashboard", { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as StudentDashboardPayload;
        setData(j);
      } catch {
        /* ignore */
      }
    });
    return loadQueueRef.current;
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onFocus = () => void load();
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  useEffect(() => {
    setData(initialDashboard);
  }, [initialDashboard]);

  const hasPortfolio = Boolean(
    user.portfolioUrl?.trim() || user.portfolioFileName?.trim() || user.portfolioFileDataUrl?.trim(),
  );

  const pendingFooter =
    data.pendingMentorshipRequests > 0
      ? `${data.pendingMentorshipRequests} request${data.pendingMentorshipRequests === 1 ? "" : "s"} pending`
      : "No pending requests";

  const messagesFooter =
    data.unreadThreads > 0
      ? `${data.unreadThreads} thread${data.unreadThreads === 1 ? "" : "s"} awaiting your reply`
      : "You’re all caught up";

  const profileFooter =
    data.profileCompletionPercent >= 100 ? "Profile complete" : "Finish your profile to reach 100%";

  return (
    <div className="w-full">
      <GoogleCalendarRequiredModal googleCalendarConnected={googleCalendarConnected} variant="student" />
      <Suspense fallback={null}>
        <ProfileCompletionWelcome variant="student" />
      </Suspense>
      <StudentProfileHero user={user} />

      <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 lg:px-10 lg:py-11">
        <div className="flex flex-col gap-1 border-b border-black/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight text-[#0a0a0a] sm:text-xl">
              My Dashboard
            </h2>
            <p className="mt-1.5 text-[13px] text-[#5c5c66] sm:text-sm">
              Live overview — updates every few seconds and when you return to this tab.
            </p>
          </div>
          <p className="text-[11px] font-medium text-[#9ca3af]" aria-live="polite">
            Auto-refresh on
          </p>
        </div>

        <div className="mb-8 mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <div className={`${card} flex min-h-[118px] flex-col justify-between border-l-4 border-l-primary p-5`}>
            <div>
              <p className="text-[13px] leading-snug text-[#6b7280]">Active mentorships</p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-[#0a0a0a]">
                {data.activeMentorships}
              </p>
            </div>
            <p className="mt-3 text-[12px] leading-tight text-emerald-600">{pendingFooter}</p>
          </div>

          <div className={`${card} flex min-h-[118px] flex-col justify-between border-l-4 border-l-[#2b7fff] p-5`}>
            <div>
              <p className="text-[13px] leading-snug text-[#6b7280]">Upcoming sessions</p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-[#0a0a0a]">
                {data.upcomingSessionsCount}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[12px] leading-tight text-[#4b5563]">
              <CalendarIcon className="size-3.5 shrink-0 text-[#9ca3af]" />
              <span>{data.nextSessionSummary}</span>
            </div>
          </div>

          <div className={`${card} flex min-h-[118px] flex-col justify-between border-l-4 border-l-[#ad46ff] p-5`}>
            <div>
              <p className="text-[13px] leading-snug text-[#6b7280]">Messages</p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#9ca3af]">Mentor threads</p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-[#0a0a0a]">
                {data.messageThreadsTotal}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[12px] leading-tight text-primary">
              <MessageIcon className="size-3.5 shrink-0 text-[#9ca3af]" />
              <span>{messagesFooter}</span>
            </div>
          </div>

          <div className={`${card} flex min-h-[118px] flex-col justify-between border-l-4 border-l-emerald-500 p-5`}>
            <div>
              <p className="text-[13px] leading-snug text-[#6b7280]">Profile</p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-[#0a0a0a]">
                {data.profileCompletionPercent}%
              </p>
            </div>
            <p className="mt-3 text-[12px] leading-tight text-emerald-600">{profileFooter}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_min(100%,22rem)] xl:grid-cols-[minmax(0,1fr)_23.75rem] lg:gap-8">
          <div className="flex min-w-0 flex-col gap-6">
            <section className={`${card} p-5 sm:p-6`}>
              <h2 className={sectionTitle}>Your mentors</h2>
              <p className={sectionDesc}>Mentors you have an upcoming session with</p>
              {data.mentorsWithUpcomingSessions.length === 0 ? (
                <div className="mt-6 flex flex-col items-center gap-4 rounded-xl border border-dashed border-black/[0.12] bg-neutral-50/80 px-4 py-10 text-center">
                  <p className="max-w-sm text-[13px] leading-relaxed text-[#6b7280]">
                    No scheduled sessions yet. Browse mentors and book a time that works for you.
                  </p>
                  <Link
                    href="/mentors"
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary/90"
                  >
                    Find a mentor
                  </Link>
                </div>
              ) : (
                <ul className="mt-5 flex flex-col gap-3">
                  {data.mentorsWithUpcomingSessions.map((m) => (
                    <li
                      key={m.id}
                      className="flex min-h-[4.75rem] flex-col justify-center gap-3 rounded-xl border border-black/[0.08] bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3.5">
                        <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                          {m.image?.trim() ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.image} alt="" className="size-full object-cover" />
                          ) : (
                            <span className="text-[13px] font-semibold text-primary">{initialsFromName(m.name)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-[#0a0a0a]">
                            {m.name?.trim() || "Mentor"}
                          </p>
                          <p className="mt-0.5 truncate text-[13px] text-[#4b5563]">
                            {[m.mentorTitle, m.mentorCompany].filter(Boolean).join(" · ") || "Mentor"}
                          </p>
                          <p className="mt-0.5 text-[12px] text-[#9ca3af]">
                            Next: {formatSessionStartDisplay(m.nextSessionStart)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                        <StudentJoinSessionButton
                          googleMeetLink={m.googleMeetLink}
                          reloadDashboard={load}
                          className={`${rowBtn} bg-emerald-600 text-white hover:bg-emerald-600/92 disabled:cursor-wait disabled:opacity-85`}
                        />
                        <Link
                          href={`/messages?peer=${encodeURIComponent(m.id)}`}
                          className={`${rowBtn} bg-primary text-white hover:bg-primary/92`}
                        >
                          Message
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={`${card} p-5 sm:p-6`}>
              <h2 className={sectionTitle}>Recommended for you</h2>
              <p className={sectionDesc}>Communities, events, and next steps</p>
              <ul className="mt-5 flex flex-col gap-3">
                {recommendations.map((r) => (
                  <li
                    key={r.title}
                    className="flex min-h-[4.25rem] flex-col justify-center gap-3 rounded-xl border border-black/[0.08] bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium text-[#0a0a0a]">{r.title}</p>
                      <p className="mt-0.5 text-[13px] text-[#6b7280]">{r.meta}</p>
                    </div>
                    <Link
                      href={r.href}
                      className={`${rowBtn} border border-black/[0.12] bg-white text-[#0a0a0a] hover:bg-neutral-50`}
                    >
                      {r.cta}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="flex min-w-0 flex-col gap-6 lg:max-w-none">
            <section className={`${card} p-5 sm:p-6`}>
              <h2 className={sectionTitle}>Quick actions</h2>
              <div className="mt-4 flex flex-col gap-2.5">
                <Link
                  href="/mentors"
                  className="flex h-10 items-center justify-center rounded-lg bg-primary text-[13px] font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  Browse mentors
                </Link>
                <Link
                  href="/student/profile/edit?tab=portfolio"
                  className="flex h-10 items-center justify-center rounded-lg border border-black/[0.1] bg-white text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-neutral-50"
                >
                  {hasPortfolio ? "View portfolio" : "Upload portfolio"}
                </Link>
                <Link
                  href="/contact"
                  className="flex h-10 items-center justify-center rounded-lg border border-black/[0.1] bg-white text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-neutral-50"
                >
                  Join discussion
                </Link>
              </div>
            </section>

            <section className={`${card} p-5 sm:p-6`}>
              <h2 className={sectionTitle}>Upcoming sessions</h2>
              {data.upcomingSessions.length === 0 ? (
                <p className="mt-4 rounded-xl border border-black/[0.06] bg-neutral-50/80 px-3.5 py-6 text-center text-[13px] text-[#6b7280]">
                  No sessions yet
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-2.5">
                  {data.upcomingSessions.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-xl border border-black/[0.08] bg-white px-3.5 py-3"
                    >
                      <p className="text-[13px] font-semibold text-[#0a0a0a]">{s.mentorName}</p>
                      <p className="mt-1 text-[12px] text-[#6b7280]">{formatSessionStartDisplay(s.startAt)}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StudentJoinSessionButton
                          googleMeetLink={s.googleMeetLink}
                          reloadDashboard={load}
                          className="inline-flex h-8 items-center justify-center rounded-lg bg-emerald-600 px-3 text-[12px] font-semibold text-white transition hover:bg-emerald-600/92 disabled:cursor-wait disabled:opacity-85"
                        />
                        <Link
                          href={`/student/upcoming/${encodeURIComponent(s.mentorId)}`}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-black/[0.12] bg-white px-3 text-[12px] font-medium text-[#0a0a0a] transition hover:bg-neutral-50"
                        >
                          Details
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={`${card} p-5 sm:p-6`}>
              <h2 className={sectionTitle}>Sessions completed</h2>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-[#0a0a0a]">{data.sessionsCompleted}</p>
              <p className="mt-1 text-[12px] text-[#6b7280]">Past bookings on Commonsia</p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 7V5m8 2V5m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
