"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ProfileCover } from "@/components/ProfileCover";
import { PortfolioViewerPanel } from "@/components/profile/PortfolioViewerPanel";
import {
  InstagramGlyph,
  LinkedInGlyph,
  SocialIconButton,
  WhatsAppGlyph,
} from "@/components/profile/ProfileSocialIcons";
import type { Mentor } from "@/lib/mentors-data";
import { mentors as allMentors } from "@/lib/mentors-data";

const pill =
  "inline-flex items-center rounded-full bg-primary/95 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm ring-1 ring-primary/20 sm:text-xs";

const MOCK_REVIEWS = [
  {
    text: "Incredibly helpful on my studio jury prep — clear feedback and very approachable.",
    name: "Rohit Kohli",
    meta: "B.Arch 2nd Year, IIT Kharagpur",
    initials: "RK",
  },
  {
    text: "Guided me through portfolio layout and narrative. Would recommend to anyone in fourth year.",
    name: "Ananya Sharma",
    meta: "B.Arch 4th Year, SPA Delhi",
    initials: "AS",
  },
  {
    text: "Great perspective on sustainable urban systems and how to frame competition entries.",
    name: "Vikram Desai",
    meta: "B.Arch 3rd Year, CEPT",
    initials: "VD",
  },
];

const MOCK_ACHIEVEMENTS = [
  {
    title: "Excellence in Teaching Award",
    body: "Recognized for sustained student mentorship and studio instruction.",
    year: "2024",
  },
  {
    title: "Urban Design Lab — Lead Researcher",
    body: "Led a public-realm morphology study adopted by the city planning cell.",
    year: "2022",
  },
  {
    title: "Portfolio: Selected Works",
    body: "Curated exhibition of adaptive reuse and transit-oriented development projects.",
    year: "2021",
  },
];

type Tab = "overview" | "reviews" | "achievements";

export function PublicMentorProfile({
  mentor,
  messageHref,
  scheduleHref,
  viewerPortfolio,
}: {
  mentor: Mentor;
  messageHref: string;
  scheduleHref: string;
  /** When this marketing card is linked to a real mentor `User`, students can open their shared portfolio. */
  viewerPortfolio?: {
    userId: string;
    portfolioUrl: string | null;
    portfolioFileName: string | null;
    portfolioVisibleToOthers: boolean;
  } | null;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [reviewIdx, setReviewIdx] = useState(0);
  const [similarIdx, setSimilarIdx] = useState(0);

  const similar = useMemo(
    () => allMentors.filter((m) => m.id !== mentor.id).slice(0, 6),
    [mentor.id],
  );

  const experienceLines = [mentor.shortBio, mentor.detail].filter(Boolean);

  const reviewVisible = 2;
  const maxReviewStart = Math.max(0, MOCK_REVIEWS.length - reviewVisible);
  const reviewStart = Math.min(reviewIdx, maxReviewStart);

  const similarPageSize = 2;
  const maxSimilarStart = Math.max(0, similar.length - similarPageSize);
  const similarStart = Math.min(similarIdx, maxSimilarStart);

  return (
    <div className="bg-white pb-16">
      <section className="border-b border-black/[0.06] bg-white">
        <ProfileCover
          imageSrc={mentor.image}
          alt=""
          priority
          readableGradientClassName="bg-gradient-to-t from-black/[0.42] via-black/[0.12] to-transparent"
        />

        <div className="relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-0 sm:px-6 sm:pb-10 lg:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10 lg:gap-12">
            <div className="-mt-10 flex shrink-0 justify-center sm:-mt-[4.25rem] lg:-mt-[5rem] sm:justify-start">
              <div className="relative size-[7.75rem] overflow-hidden rounded-full bg-neutral-100 ring-[5px] ring-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] sm:size-[9rem]">
                <Image src={mentor.image} alt="" fill className="object-cover object-center" sizes="144px" />
              </div>
            </div>

            <div className="min-w-0 flex-1 pt-1 sm:pt-[4.75rem]">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-10 lg:gap-y-1">
                <h1 className="text-center font-heading text-[1.35rem] font-semibold tracking-tight text-[#0a0a0a] sm:text-2xl lg:text-left lg:text-[1.75rem] lg:col-start-1 lg:row-start-1">
                  {mentor.name}
                </h1>
                <p className="mx-auto max-w-xl text-center text-[13px] italic leading-relaxed text-[#5c5c66] sm:text-sm lg:mx-0 lg:text-left lg:col-start-1 lg:row-start-2">
                  {mentor.role}
                </p>

                <div className="flex flex-col items-center gap-3 lg:col-start-2 lg:row-start-1 lg:items-end lg:self-start">
                  <div className="flex flex-wrap items-center justify-center gap-2.5 lg:justify-end">
                    <Link
                      href={messageHref}
                      className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-white shadow-md ring-1 ring-primary/20 transition hover:bg-primary/90"
                      aria-label="Message"
                    >
                      <ChatBubbleIcon className="size-[18px] text-white" />
                    </Link>
                    <Link
                      href={scheduleHref}
                      className="inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-md ring-1 ring-primary/25 transition hover:bg-primary/90"
                    >
                      Schedule a Call
                    </Link>
                  </div>
                  <div className="flex justify-center gap-3 lg:justify-end">
                    <SocialIconButton href={null} label="WhatsApp" icon={<WhatsAppGlyph />} />
                    <SocialIconButton
                      href={null}
                      label="LinkedIn"
                      icon={<LinkedInGlyph profileToolbar brandColor />}
                      className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-white shadow-sm transition hover:bg-primary/5"
                    />
                    <SocialIconButton href={null} label="Instagram" icon={<InstagramGlyph />} />
                  </div>
                </div>

                <p className="text-left text-[13px] leading-relaxed text-[#3e3e3e] sm:text-sm lg:col-start-1 lg:row-start-3 lg:max-w-2xl lg:pt-1">
                  {mentor.detail}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
        <nav className="mt-8 flex gap-8 border-b border-black/[0.08]">
          {(
            [
              ["overview", "Overview"],
              ["reviews", "Reviews"],
              ["achievements", "Achievements"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`relative pb-3 text-sm font-semibold transition ${
                tab === id ? "text-primary" : "text-neutral-500 hover:text-[#0a0a0a]"
              }`}
            >
              {label}
              {tab === id ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
              ) : null}
            </button>
          ))}
        </nav>

        {tab === "overview" ? (
          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,65%)_minmax(0,35%)] lg:gap-10">
            <div className="space-y-8">
              <div>
                <h2 className="text-base font-semibold text-[#0a0a0a]">Specialization</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {mentor.tags.map((t) => (
                    <span key={t} className={pill}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#0a0a0a]">Experience &amp; Background</h2>
                <ul className="mt-3 list-inside list-disc space-y-1.5 text-[14px] leading-relaxed text-[#374151] marker:text-primary">
                  {experienceLines.map((line, i) => (
                    <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
                  ))}
                </ul>
              </div>
              {viewerPortfolio ? (
                <PortfolioViewerPanel
                  userId={viewerPortfolio.userId}
                  portfolioUrl={viewerPortfolio.portfolioUrl}
                  portfolioFileName={viewerPortfolio.portfolioFileName}
                  portfolioVisibleToOthers={viewerPortfolio.portfolioVisibleToOthers}
                />
              ) : null}
            </div>

            <aside className="h-fit rounded-[14px] border border-black/10 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-base font-semibold text-[#0a0a0a]">Statistics</h2>
              <p className="mb-4 text-[11px] text-[#9ca3af]">Sample metrics for this profile.</p>
              <div className="grid gap-3">
                <div className="flex gap-3 rounded-xl border border-sky-100 bg-sky-50/80 p-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/rocket.svg" alt="" className="icon-brand-line size-5 object-contain" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold tabular-nums text-[#0a0a0a]">500 Minutes</p>
                    <p className="text-[11px] text-[#6b7280]">Total Mentoring Time</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50/80 p-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/session.svg" alt="" className="icon-brand-line size-5 object-contain" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold tabular-nums text-[#0a0a0a]">60 Sessions</p>
                    <p className="text-[11px] text-[#6b7280]">Sessions Completed</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {tab === "reviews" ? (
          <div className="mt-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {MOCK_REVIEWS.slice(reviewStart, reviewStart + reviewVisible).map((r) => (
                <article
                  key={r.name + r.text.slice(0, 12)}
                  className="flex min-h-[200px] flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {r.initials}
                  </div>
                  <p className="mt-3 flex-1 text-[13px] leading-relaxed text-[#374151]">{r.text}</p>
                  <div className="mt-4 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#0a0a0a]">{r.name}</p>
                      <p className="text-xs text-neutral-500">{r.meta}</p>
                    </div>
                    <span className="text-primary" aria-hidden>
                      ★
                    </span>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <CarouselBtn
                dir="prev"
                disabled={reviewStart <= 0}
                onClick={() => setReviewIdx((i) => Math.max(0, i - 1))}
              />
              <CarouselBtn
                dir="next"
                disabled={reviewStart >= maxReviewStart}
                onClick={() => setReviewIdx((i) => Math.min(maxReviewStart, i + 1))}
              />
            </div>
          </div>
        ) : null}

        {tab === "achievements" ? (
          <ul className="mt-8 space-y-4">
            {MOCK_ACHIEVEMENTS.map((a) => (
              <li
                key={a.title}
                className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold text-[#0a0a0a]">{a.title}</h3>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
                    {a.year}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#4b5563]">{a.body}</p>
              </li>
            ))}
          </ul>
        ) : null}

        <section className="mt-14 border-t border-black/[0.06] pt-10">
          <h2 className="text-base font-semibold text-[#0a0a0a]">Mentors With Similar Expertise</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {similar.slice(similarStart, similarStart + similarPageSize).map((m, i) => (
              <article
                key={`${m.id}-${similarStart}-${i}`}
                className="grid grid-cols-1 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(0,34%)]"
              >
                <div className="flex flex-col justify-between gap-2 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#0a0a0a]">{m.name}</h3>
                    <p className="mt-0.5 text-[11px] font-semibold text-neutral-600">{m.role}</p>
                    <p className="mt-2 text-xs leading-snug text-[#374151]">{m.shortBio}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.tags.slice(0, 5).map((t) => (
                        <span
                          key={t}
                          className="rounded bg-primary px-1.5 py-px text-[9px] font-semibold text-white"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] font-semibold text-neutral-800">{m.slot}</p>
                  </div>
                  <Link
                    href={`/mentors/${m.id}`}
                    className="mt-2 inline-flex w-fit rounded-full bg-primary px-3 py-1.5 text-[10px] font-semibold text-white"
                  >
                    View profile
                  </Link>
                </div>
                <div className="relative min-h-[140px] w-full">
                  <Image src={m.image} alt="" fill className="object-cover object-center md:rounded-r-xl" />
                </div>
              </article>
            ))}
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <CarouselBtn
              dir="prev"
              disabled={similarStart <= 0}
              onClick={() => setSimilarIdx((i) => Math.max(0, i - 1))}
            />
            <CarouselBtn
              dir="next"
              disabled={similarStart >= maxSimilarStart}
              onClick={() => setSimilarIdx((i) => Math.min(maxSimilarStart, i + 1))}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function CarouselBtn({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-md disabled:opacity-40"
      aria-label={dir === "prev" ? "Previous" : "Next"}
    >
      {dir === "prev" ? "‹" : "›"}
    </button>
  );
}

function ChatBubbleIcon({ className }: { className?: string }) {
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
