"use client";

import Link from "next/link";

import { StudentProfileHero } from "@/components/student/StudentProfileHero";
import type { StudentProfileUser } from "@/components/student/student-profile-types";

const statCards: {
  title: string;
  value: string;
  footer: string;
  border: string;
  footerTone?: "default" | "green" | "orange";
  icon?: "calendar" | "message" | "trophy";
}[] = [
  {
    title: "Active Mentorships",
    value: "2",
    footer: "+1 this month",
    footerTone: "green",
    border: "border-l-primary",
  },
  {
    title: "Upcoming Sessions",
    value: "3",
    footer: "Next: Tomorrow",
    icon: "calendar",
    border: "border-l-[#2b7fff]",
  },
  {
    title: "Messages",
    value: "5",
    footer: "2 unread",
    footerTone: "orange",
    icon: "message",
    border: "border-l-[#ad46ff]",
  },
  {
    title: "Achievement",
    value: "85%",
    footer: "Profile complete",
    icon: "trophy",
    border: "border-l-emerald-500",
  },
];

const mentors = [
  {
    initials: "DSJ",
    name: "Dr. Sarah Johnson",
    role: "Senior Architect",
    focus: "Sustainable Design",
  },
  {
    initials: "MC",
    name: "Michael Chen",
    role: "Design Director",
    focus: "Urban Planning",
  },
];

const recommended = [
  { title: "Sustainable Design Workshop", meta: "Event • March 25, 2026" },
  { title: "Introduction to Parametric Design", meta: "Course • Available now" },
  { title: "Portfolio Review Session", meta: "Event • March 28, 2026" },
];

const sessions = [
  { name: "Dr. Sarah Johnson", time: "Tomorrow at 2:00 PM" },
  { name: "Michael Chen", time: "Mar 23 at 4:30 PM" },
  { name: "Dr. Sarah Johnson", time: "Mar 25 at 2:00 PM" },
];

const card = "rounded-xl border border-black/10 bg-white shadow-sm";
const sectionTitle = "text-sm font-semibold text-[#0a0a0a]";
const sectionDesc = "mt-0.5 text-[13px] text-[#717182]";

export function StudentDashboard({ user }: { user: StudentProfileUser }) {
  return (
    <div className="w-full">
      <StudentProfileHero user={user} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <h2 className="font-heading text-lg font-semibold tracking-tight text-[#0a0a0a] sm:text-xl">
          My Dashboard
        </h2>
        <p className="mt-1 text-[13px] text-[#717182] sm:text-sm">
          Overview of your mentorships, sessions, and progress.
        </p>

      <div className="mb-8 mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {statCards.map((c) => (
          <div
            key={c.title}
            className={`${card} border-l-4 p-4 ${c.border}`}
          >
            <p className="text-[13px] text-[#717182]">{c.title}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[#0a0a0a]">{c.value}</p>
            <div className="mt-3 flex items-center gap-1.5 text-[12px] leading-tight">
              {c.icon === "calendar" && <CalendarIcon className="size-3.5 shrink-0 text-[#717182]" />}
              {c.icon === "message" && <MessageIcon className="size-3.5 shrink-0 text-[#717182]" />}
              {c.icon === "trophy" && <TrophyIcon className="size-3.5 shrink-0 text-[#717182]" />}
              <span
                className={
                  c.footerTone === "green"
                    ? "text-emerald-600"
                    : c.footerTone === "orange"
                      ? "text-primary"
                      : "text-[#4a5565]"
                }
              >
                {c.footer}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="space-y-5 lg:col-span-8">
          <section className={`${card} p-4 sm:p-5`}>
            <h2 className={sectionTitle}>Your Mentors</h2>
            <p className={sectionDesc}>Connect with your active mentors</p>
            <ul className="mt-4 space-y-3">
              {mentors.map((m) => (
                <li
                  key={m.name}
                  className="flex flex-col gap-3 rounded-lg border border-black/10 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-[13px] font-medium text-primary">{m.initials}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0a0a0a]">{m.name}</p>
                      <p className="text-[13px] text-[#4a5565]">{m.role}</p>
                      <p className="text-[11px] text-[#6a7282]">{m.focus}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary/90 sm:self-center"
                  >
                    Message
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${card} p-4 sm:p-5`}>
            <h2 className={sectionTitle}>Recommended for You</h2>
            <p className={sectionDesc}>Resources based on your interests</p>
            <ul className="mt-4 space-y-2">
              {recommended.map((r) => (
                <li
                  key={r.title}
                  className="flex flex-col gap-2 rounded-lg border border-black/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#0a0a0a]">{r.title}</p>
                    <p className="text-[13px] text-[#4a5565]">{r.meta}</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-md border border-black/10 bg-white px-3 py-1.5 text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-neutral-50"
                  >
                    View
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-5 lg:col-span-4">
          <section className={`${card} p-4 sm:p-5`}>
            <h2 className={sectionTitle}>Quick Actions</h2>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href="/mentors"
                className="rounded-md bg-primary py-2.5 text-center text-[13px] font-semibold text-white transition-colors hover:bg-primary/90"
              >
                Browse Mentors
              </Link>
              <Link
                href="/schedule"
                className="rounded-md border border-black/10 bg-white py-2.5 text-center text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-neutral-50"
              >
                Schedule Session
              </Link>
              <Link
                href="/student/setup/3"
                className="rounded-md border border-black/10 bg-white py-2.5 text-center text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-neutral-50"
              >
                Upload Portfolio
              </Link>
              <Link
                href="/contact"
                className="rounded-md border border-black/10 bg-white py-2.5 text-center text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-neutral-50"
              >
                Join Discussion
              </Link>
            </div>
          </section>

          <section className={`${card} p-4 sm:p-5`}>
            <h2 className={sectionTitle}>Upcoming Sessions</h2>
            <ul className="mt-3 space-y-2">
              {sessions.map((s, i) => (
                <li key={`${s.name}-${i}`} className="rounded-lg border border-black/10 px-3 py-2.5">
                  <p className="text-[13px] font-medium text-[#0a0a0a]">{s.name}</p>
                  <p className="mt-0.5 text-[12px] text-[#4a5565]">{s.time}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${card} p-4 sm:p-5`}>
            <h2 className={sectionTitle}>Your Progress</h2>
            <div className="mt-3 space-y-3">
              <div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#0a0a0a]">Profile Completion</span>
                  <span className="font-medium text-primary">85%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                  <div className="h-full w-[85%] rounded-full bg-primary" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#0a0a0a]">Sessions Completed</span>
                  <span className="font-medium text-primary">12/20</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                  <div className="h-full w-[60%] rounded-full bg-primary" />
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

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM5 4H3v3a3 3 0 003 3M19 4h2v3a3 3 0 01-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
