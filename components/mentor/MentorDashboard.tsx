import Link from "next/link";
import type { ReactNode } from "react";

import type { MentorDashboardUser } from "@/components/mentor/mentor-dashboard-types";
import { normalizeMentorYearsBand } from "@/components/mentor/mentor-setup-constants";
import { MentorProfileHero } from "@/components/mentor/MentorProfileHero";
import { profileSkillsSectionTitle } from "@/components/profile/profile-hero-classes";
import { formatMentoringMinutesLong } from "@/lib/format-mentoring-minutes";
import {
  formatRelativePast,
  formatSessionBadge,
} from "@/lib/mentor-dashboard-stats";

type Props = { user: MentorDashboardUser };

/** Figma Main Content (130:6879) — cards use 14px radius, hairline border */
const card =
  "rounded-[14px] border border-black/10 bg-white p-4 shadow-sm sm:p-5";

function buildExperienceBullets(user: MentorDashboardUser): string[] {
  const bullets: string[] = [];
  const title = user.mentorTitle?.trim();
  const company = user.mentorCompany?.trim();
  const years =
    normalizeMentorYearsBand(user.mentorYearsExperience) || user.mentorYearsExperience?.trim() || "";
  const line = [title, company].filter(Boolean).join(", ");
  if (line && years) bullets.push(`${line} (${years})`);
  else if (line) bullets.push(line);
  if (user.mentorCertifications?.trim()) {
    for (const part of user.mentorCertifications.split(/[;\n]/)) {
      const s = part.trim();
      if (s) bullets.push(s);
    }
  }
  const focus = user.mentorMentorshipFocus?.trim();
  if (focus && !bullets.some((b) => b.includes(focus.slice(0, 40)))) {
    bullets.push(focus);
  }
  return bullets;
}

function initials(name: string | null): string {
  if (!name?.trim()) return "?";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Mentor-only home — profile header + dashboard sections aligned to product mockups. */
export function MentorDashboard({ user }: Props) {
  const live = user.dashboardLive;
  const expertise = Array.isArray(user.mentorExpertise)
    ? (user.mentorExpertise as string[]).filter(Boolean)
    : [];
  const experienceBullets = buildExperienceBullets(user);
  const currentMentees = live?.activeMenteeCount ?? 0;

  const completedSessions = live?.completedSessionCount ?? 0;
  const totalMentoringMinutes = live?.totalMentoringMinutes ?? 0;
  const upcomingList = live?.upcomingSessions ?? [];
  const upcomingCount = live?.upcomingSessionCount ?? 0;
  const firstUpcoming = upcomingList[0];
  const upcomingSub = firstUpcoming
    ? `Next ${new Date(firstUpcoming.startAt).toLocaleString("en-IN", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      })} IST`
    : upcomingCount === 0
      ? "Nothing scheduled"
      : `${upcomingCount} scheduled`;

  const avgRating = live?.averageRating;
  const reviewCount = live?.reviewCount ?? 0;
  const impactScore = live?.impactScore ?? 0;
  const joinedMonth = live?.menteesJoinedThisMonth ?? 0;

  return (
    <div className="w-full min-w-0 bg-[#ffffff]">
      <MentorProfileHero user={user} />

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-0 sm:px-6 lg:max-w-7xl lg:px-8">
        <section className="mb-10">
          <hr className="my-8 border-[#e5e7eb]" />

          <div className="grid gap-8 lg:grid-cols-[minmax(0,65%)_minmax(0,35%)] lg:gap-10">
          <div className="space-y-8">
            <div>
              <h2 className={profileSkillsSectionTitle}>Specialization</h2>
              {expertise.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {expertise.map((t) => (
                    <span key={t} className="mentor-tag-expertise-pill">
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[13px] text-[#9ca3af]">
                  Areas of expertise from your setup will appear here.
                </p>
              )}
            </div>

            <div>
              <h2 className="text-base font-semibold text-[#0a0a0a]">
                Experience &amp; Background
              </h2>
              {experienceBullets.length > 0 ? (
                <ul className="mt-3 list-inside list-disc space-y-1.5 text-[14px] leading-relaxed text-[#374151] marker:text-primary">
                  {experienceBullets.map((b, i) => (
                    <li key={`${i}-${b.slice(0, 24)}`}>{b}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[13px] text-[#9ca3af]">
                  Your role, organization, and focus from onboarding will show
                  here.
                </p>
              )}
            </div>
          </div>

          <aside className={card + " h-fit"}>
            <h2 className="text-base font-semibold text-[#0a0a0a]">
              Statistics
            </h2>
            <p className="mb-4 text-[11px] text-[#9ca3af]">
              Live totals from completed bookings on Commonsia.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="flex gap-3 rounded-xl border border-sky-100 bg-sky-50/80 p-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-100">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG + icon-black-line */}
                  <img
                    src="/rocket.svg"
                    alt=""
                    className="icon-black-line size-5 object-contain"
                  />
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums text-[#0a0a0a]">
                    {formatMentoringMinutesLong(totalMentoringMinutes)}
                  </p>
                  <p className="text-[11px] text-[#6b7280]">Total Mentoring Time</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50/80 p-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG + icon-black-line */}
                  <img
                    src="/session.svg"
                    alt=""
                    className="icon-black-line size-5 object-contain"
                  />
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums text-[#0a0a0a]">
                    {completedSessions} Session{completedSessions === 1 ? "" : "s"}
                  </p>
                  <p className="text-[11px] text-[#6b7280]">Sessions Completed</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* —— My Dashboard (Figma 130:6879) —— */}
      <div className="mb-8 pt-2">
        <h2 className="text-[30px] font-bold leading-9 tracking-tight text-[#0a0a0a]">
          My Dashboard
        </h2>
        <p className="mt-2 text-base leading-6 text-[#4a5565]">
          Continue making an impact on the next generation
        </p>
      </div>

      <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <MetricCard
          accent="primary"
          label="Total mentees"
          value={String(currentMentees)}
          sub={
            joinedMonth > 0
              ? `+${joinedMonth} new this month`
              : "Active mentor–student chats"
          }
          subTone={joinedMonth > 0 ? "text-[#00a63e]" : "text-[#4a5565]"}
          icon={
            joinedMonth > 0 ? (
              <IconTrendUp className="size-4 shrink-0 text-[#00a63e]" />
            ) : undefined
          }
        />
        <MetricCard
          accent="blue"
          label="Upcoming sessions"
          value={String(upcomingCount)}
          sub={upcomingSub}
          subTone="text-[#4a5565]"
          icon={<IconClock className="size-4 shrink-0 text-[#4a5565]" />}
        />
        <MetricCard
          accent="violet"
          label="Avg. rating"
          value={avgRating != null ? String(avgRating) : "—"}
          sub={
            reviewCount > 0
              ? `Based on ${reviewCount} review${reviewCount === 1 ? "" : "s"}`
              : "No reviews yet"
          }
          subTone="text-[#d08700]"
          icon={<IconStar className="size-4 shrink-0 text-[#d08700]" />}
        />
        <MetricCard
          accent="green"
          label="Impact score"
          value={`${impactScore}%`}
          sub={
            impactScore >= 75
              ? "Strong engagement"
              : impactScore >= 40
                ? "Growing impact"
                : "Based on sessions & reviews"
          }
          subTone="text-[#00a63e]"
          icon={<IconAward className="size-4 shrink-0 text-[#00a63e]" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,357px)] lg:gap-6">
        <div className="space-y-6">
          <section className={card}>
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-medium text-[#0a0a0a]">
                  Your Mentees
                </h3>
                <p className="mt-0.5 text-base text-[#717182]">
                  Students you&apos;re currently mentoring
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[14px] font-medium text-[#0a0a0a] shadow-sm transition hover:bg-neutral-50"
              >
                View All
              </button>
            </div>
            {live && live.mentees.length > 0 ? (
              <ul className="space-y-4">
                {live.mentees.map((m) => (
                  <li
                    key={m.threadId}
                    className="rounded-[10px] border border-black/10 bg-white p-4 pt-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-base font-medium text-primary">
                          {m.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.image} alt="" className="size-full object-cover" />
                          ) : (
                            initials(m.name)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-semibold leading-6 text-[#0a0a0a]">
                            {m.name}
                          </p>
                          <p className="text-sm leading-5 text-[#4a5565]">{m.subtitle}</p>
                          <p className="mt-1 text-xs leading-4 text-[#6a7282]">
                            Focus: {m.focus}
                          </p>
                          <p className="mt-1 text-xs leading-4 text-[#6a7282]">
                            Last session: {m.lastSessionLabel}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                        <Link
                          href={`/mentor/students/${m.studentId}`}
                          className="flex h-8 items-center rounded-lg border border-black/10 bg-white px-3 text-[14px] font-medium text-[#0a0a0a] hover:bg-neutral-50"
                        >
                          Profile
                        </Link>
                        <Link
                          href={`/messages?peer=${encodeURIComponent(m.studentId)}`}
                          className="flex size-8 items-center justify-center rounded-lg border border-black/10 bg-white text-[#0a0a0a] hover:bg-neutral-50"
                          aria-label={`Message ${m.name}`}
                        >
                          <IconChat className="size-4" />
                        </Link>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs leading-4 text-[#6a7282]">
                        <span>Engagement</span>
                        <span>{m.progressPct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${m.progressPct}%` }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-[10px] border border-dashed border-black/10 bg-neutral-50/80 px-4 py-8 text-center text-sm text-[#6a7282]">
                No active mentee chats yet. When students connect, they&apos;ll appear here.
              </p>
            )}
          </section>

          <section className={card}>
            <h3 className="text-base font-medium text-[#0a0a0a]">
              Recent Activity
            </h3>
            <p className="mt-0.5 text-base text-[#717182]">
              Your latest mentoring activities
            </p>
            {live && live.activities.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {live.activities.map((a) => (
                  <ActivityRow
                    key={a.id}
                    tone={a.tone}
                    icon={
                      a.icon === "calendar" ? (
                        <IconCalendar className="size-4" />
                      ) : a.icon === "chat" ? (
                        <IconChat className="size-4" />
                      ) : (
                        <IconStarOutline className="size-4" />
                      )
                    }
                    title={a.title}
                    time={formatRelativePast(a.at)}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-[10px] border border-dashed border-black/10 bg-neutral-50/80 px-4 py-6 text-center text-sm text-[#6a7282]">
                No recent activity yet — sessions, messages, and reviews will show up here.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className={card}>
            <h3 className="text-base font-medium text-[#0a0a0a]">
              Quick Actions
            </h3>
            <div className="mt-4 flex flex-col gap-2.5">
              <button
                type="button"
                className="h-8 w-full rounded-lg bg-primary text-[14px] font-medium text-white shadow-sm transition hover:bg-primary/90"
              >
                Schedule Session
              </button>
              <button
                type="button"
                className="h-8 w-full rounded-lg border border-black/10 bg-white text-[14px] font-medium text-[#0a0a0a] hover:bg-neutral-50"
              >
                Join Discussion
              </button>
              <button
                type="button"
                className="h-8 w-full rounded-lg border border-black/10 bg-white text-[14px] font-medium text-[#0a0a0a] hover:bg-neutral-50"
              >
                Create Resource
              </button>
            </div>
          </section>

          <section className={card}>
            <h3 className="text-base font-medium text-[#0a0a0a]">
              Upcoming Sessions
            </h3>
            <p className="mt-0.5 text-base text-[#717182]">
              Your scheduled mentoring sessions
            </p>
            {upcomingList.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {upcomingList.map((s) => {
                  const who = s.student.name?.trim() || "Student";
                  const badge = formatSessionBadge(new Date(s.startAt));
                  const timeStr = new Date(s.startAt).toLocaleTimeString("en-IN", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "Asia/Kolkata",
                  });
                  return (
                    <SessionRow
                      key={s.id}
                      name={who}
                      topic={s.title?.trim() || "Mentoring session"}
                      time={`${timeStr} IST`}
                      badge={badge.label}
                      badgeClass={badge.className}
                    />
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-6 text-[#717182]">
                No upcoming sessions. Bookings will appear here when students schedule with you.
              </p>
            )}
          </section>

          <section className={card}>
            <h3 className="text-base font-medium text-[#0a0a0a]">
              Recognition
            </h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/90 px-3 py-2.5">
                <IconMedal className="size-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-[#0a0a0a]">Top Mentor</p>
                  <p className="text-xs text-[#6a7282]">March 2026</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50/90 px-3 py-2.5">
                <IconStar className="size-5 shrink-0 text-sky-600" />
                <div>
                  <p className="text-sm font-medium text-[#0a0a0a]">
                    {avgRating != null && avgRating >= 4.5 ? "5-Star Rated" : "Reviews"}
                  </p>
                  <p className="text-xs text-[#6a7282]">
                    {reviewCount > 0
                      ? `${reviewCount} review${reviewCount === 1 ? "" : "s"}`
                      : "No reviews yet"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
      </div>
    </div>
  );
}

function ActivityRow({
  tone,
  icon,
  title,
  time,
}: {
  tone: string;
  icon: ReactNode;
  title: string;
  time: string;
}) {
  return (
    <li className="flex gap-3 rounded-[10px] border border-black/10 bg-white px-3 py-3">
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${tone}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm leading-5 text-[#0a0a0a]">{title}</p>
        <p className="mt-1 text-xs leading-4 text-[#6a7282]">{time}</p>
      </div>
    </li>
  );
}

function SessionRow({
  name,
  topic,
  time,
  badge,
  badgeClass,
}: {
  name: string;
  topic: string;
  time: string;
  badge: string;
  badgeClass: string;
}) {
  return (
    <li className="rounded-[10px] border border-black/10 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-5 text-[#0a0a0a]">{name}</p>
        <span
          className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${badgeClass}`}
        >
          {badge}
        </span>
      </div>
      <p className="mt-2 text-sm leading-5 text-[#4a5565]">{topic}</p>
      <p className="mt-0.5 text-sm leading-5 text-[#4a5565]">{time}</p>
    </li>
  );
}

/** Figma metric cards: 4px left accent, 14px radius, Inter-scale type */
function MetricCard({
  accent,
  label,
  value,
  sub,
  subTone = "text-[#4a5565]",
  icon,
}: {
  accent: "primary" | "blue" | "violet" | "green";
  label: string;
  value: string;
  sub: string;
  subTone?: string;
  icon?: ReactNode;
}) {
  const left = {
    primary: "border-l-4 border-l-primary",
    blue: "border-l-4 border-l-[#2b7fff]",
    violet: "border-l-4 border-l-[#ad46ff]",
    green: "border-l-4 border-l-[#00c950]",
  }[accent];

  return (
    <div
      className={`flex min-h-[10.75rem] flex-col rounded-[14px] border border-black/10 bg-white px-6 pb-6 pt-6 shadow-sm ${left}`}
    >
      <div>
        <p className="text-base font-normal leading-6 text-[#717182]">{label}</p>
        <p className="mt-1 text-[30px] font-medium leading-9 tabular-nums text-[#0a0a0a]">
          {value}
        </p>
      </div>
      <p
        className={`mt-6 flex items-center gap-1 text-sm font-normal leading-5 ${subTone}`}
      >
        {icon}
        {sub}
      </p>
    </div>
  );
}

function IconTrendUp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 17l6-6 4 4 7-7M14 7h7v7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconStar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function IconStarOutline({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconAward({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="6" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconChat({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 12a8 8 0 01-8 8H8l-5 3v-3a8 8 0 018-8h10z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMedal({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="9" r="5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8 14l-2 8 6-3 6 3-2-8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}
