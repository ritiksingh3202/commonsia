"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { MentorAvatar } from "@/components/mentors/MentorAvatar";
import { MentorCard } from "@/components/mentors/MentorCard";
import { MentorCarouselArrows } from "@/components/mentors/MentorCarouselArrows";
import { profileHero, profileSkillsSectionTitle } from "@/components/profile/profile-hero-classes";
import { ProfileCover } from "@/components/ProfileCover";
import { PortfolioViewerPanel } from "@/components/profile/PortfolioViewerPanel";
import { LinkedInGlyph, SocialIconButton } from "@/components/profile/ProfileSocialIcons";
import { avatarColorsFromSeed } from "@/lib/avatar-initials";
import { formatMentoringMinutesLong } from "@/lib/format-mentoring-minutes";
import type { Mentor } from "@/lib/mentor-directory";
import { NO_UPCOMING_AVAILABILITY_LABEL } from "@/lib/mentor-next-slot";
import { profileCoverDisplaySrc } from "@/lib/profile-cover";
import type { PublicMentorReview } from "@/lib/mentor-reviews";

/**
 * Poll the mentor's live next-available slot from `/api/mentors/:id/next-slot` every
 * `NEXT_SLOT_POLL_MS`. Picked at 45s so the label moves forward within the same session
 * if a slot starts or gets booked while the student is reading the page, without
 * generating noticeable network chatter. The tab `visibilitychange` listener below
 * also forces a refresh the moment the student refocuses the tab after being away.
 */
const NEXT_SLOT_POLL_MS = 45_000;

function stripNextAvailablePrefix(label: string): string {
  const s = label.trim();
  if (!s) return s;
  return s.replace(/^next\s+available\s*:?\s*/i, "").trim() || s;
}

const expertisePill = "mentor-tag-expertise-pill";

type Tab = "overview" | "reviews" | "achievements";

/** Comma-separated mentorship focus (setup step 2) → spaced chips on the hero. */
function mentorshipFocusChips(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Lines from mentor profile “Certifications” (setup step) — split on `;` or newlines. */
function achievementsFromCertifications(raw: string | null): { title: string; body: string; year: string }[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const y = line.match(/\b(19|20)\d{2}\b/);
      const year = y?.[0] ?? "";
      const title =
        year && y?.[0] ? line.replace(y[0], "").replace(/[\s,;·\-–]+$/g, "").trim() : line;
      return { title: title || line, body: "", year };
    });
}

export function PublicMentorProfile({
  mentor,
  publicBookingStats,
  mentorReviews,
  similarMentors,
  messageHref,
  scheduleHref,
  viewerPortfolio,
  viewerSignedIn = true,
  portfolioLoginHref,
  similarMentorsPersonalized = false,
  viewerHasPendingBookingRequest = false,
  viewerUserId = null,
}: {
  mentor: Mentor;
  /** Completed `MentoringBooking` rows for this mentor (end time in the past). */
  publicBookingStats: {
    completedSessionCount: number;
    totalMentoringMinutes: number;
  };
  /** Session reviews for this mentor (from `SessionReview` where `mentorId` matches). */
  mentorReviews: PublicMentorReview[];
  similarMentors: Mentor[];
  /** When true (student signed in), suggestions use the student’s interests plus this mentor’s expertise. */
  similarMentorsPersonalized?: boolean;
  messageHref: string;
  scheduleHref: string;
  /** When this marketing card is linked to a real mentor `User`, students can open their shared portfolio. */
  viewerPortfolio?: {
    userId: string;
    portfolioUrl: string | null;
    portfolioFileName: string | null;
    portfolioVisibleToOthers: boolean;
  } | null;
  /** Authenticated viewers can open the uploaded document directly; anonymous viewers get a sign-in CTA. */
  viewerSignedIn?: boolean;
  /** `/auth/login?callbackUrl=...` back to this profile, shown to anonymous viewers. */
  portfolioLoginHref?: string;
  /** Signed-in student already submitted a pending booking request for this mentor. */
  viewerHasPendingBookingRequest?: boolean;
  /** Current viewer user id (from server session) — drives similar-mentor card booking links */
  viewerUserId?: string | null;
}) {
  const { data: session } = useSession();
  const viewerForSimilarCards = session?.user?.id ?? viewerUserId ?? null;

  const [tab, setTab] = useState<Tab>("overview");
  const [reviewIdx, setReviewIdx] = useState(0);
  const [similarIdx, setSimilarIdx] = useState(0);

  /**
   * Live "next available" label.
   *
   * Seeded from the SSR-computed `mentor.slot` so the first paint shows real content
   * (no spinner for users who never stay on the page long enough to poll). The client
   * then re-asks `/api/mentors/:id/next-slot` every `NEXT_SLOT_POLL_MS` so the label
   * advances as real time progresses — e.g. once "Today · 10:00 AM" has already passed,
   * the backend recomputes and we flip to the next candidate slot without requiring a
   * full page reload or depending on the 60s ISR revalidation window.
   */
  const [liveSlot, setLiveSlot] = useState<string>(mentor.slot);
  const [livePattern, setLivePattern] = useState<string>(mentor.availabilityPattern);

  /** Guard against race conditions when an in-flight fetch resolves after unmount. */
  const lastSlotRequestTokenRef = useRef(0);

  useEffect(() => {
    /**
     * Reset visible label whenever we navigate between mentor profiles. Next.js reuses
     * this component across `/mentors/[id]` transitions (same route layout, different
     * param), so `useState(mentor.slot)` only seeds on first mount — without this reset
     * the previous mentor's slot would linger for up to one poll interval.
     */
    /* eslint-disable react-hooks/set-state-in-effect -- mirror props into state on mentor id change (same pattern as MentorsPage) */
    setLiveSlot(mentor.slot);
    setLivePattern(mentor.availabilityPattern);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [mentor.id, mentor.slot, mentor.availabilityPattern]);

  useEffect(() => {
    /** No mentor id means this is a marketing card without a real user — skip polling. */
    if (!mentor.id) return;

    let cancelled = false;
    const abort = new AbortController();

    async function refresh() {
      const token = ++lastSlotRequestTokenRef.current;
      try {
        const res = await fetch(`/api/mentors/${encodeURIComponent(mentor.id)}/next-slot`, {
          cache: "no-store",
          signal: abort.signal,
          headers: { accept: "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          slot?: unknown;
          availabilityPattern?: unknown;
        };
        /**
         * Drop this response if another refresh has started since we fired (e.g. user
         * alt-tabbed and triggered a visibility refresh while the interval fetch was
         * mid-flight). Without the token check we could flash an older value over a newer
         * one simply because network order didn't match request order.
         */
        if (cancelled || token !== lastSlotRequestTokenRef.current) return;
        if (typeof data.slot === "string" && data.slot.trim().length > 0) {
          setLiveSlot(data.slot);
        }
        if (typeof data.availabilityPattern === "string") {
          setLivePattern(data.availabilityPattern);
        }
      } catch {
        /**
         * Network failures (offline, 503, aborted poll after navigation) should never
         * blank out the last-good label — just keep what's already rendered and try
         * again at the next tick.
         */
      }
    }

    /** Poll immediately on mount so stale SSR labels correct within the first ~500ms of view. */
    void refresh();
    const interval = window.setInterval(() => {
      /** Skip work while the tab is hidden — browsers throttle us anyway and it wastes mobile battery. */
      if (document.visibilityState === "visible") void refresh();
    }, NEXT_SLOT_POLL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      abort.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [mentor.id]);

  const nextSlotDisplay = useMemo(() => {
    const raw = liveSlot?.trim() || NO_UPCOMING_AVAILABILITY_LABEL;
    const hasUpcoming = raw !== NO_UPCOMING_AVAILABILITY_LABEL;
    return { raw, hasUpcoming, headline: hasUpcoming ? stripNextAvailablePrefix(raw) : raw };
  }, [liveSlot]);

  const similar = useMemo(() => similarMentors.filter((m) => m.id !== mentor.id), [mentor.id, similarMentors]);

  const experienceLines = mentor.experienceLines;

  const reviewVisible = 2;
  const maxReviewStart = Math.max(0, mentorReviews.length - reviewVisible);
  const reviewStart = Math.min(reviewIdx, maxReviewStart);

  const similarPageSize = 2;
  /**
   * Page by full pages (stride = similarPageSize) so each click advances to a fresh pair of
   * cards instead of overlapping pairs ([A,B] → [B,C]).
   *
   * Edge case: if the final page would contain just 1 card, back its start up so we always
   * show a full row of 2 — otherwise the grid renders an empty right-hand cell at ½-width
   * and the last card looks wider than all the others.
   */
  const similarPageCount = Math.max(1, Math.ceil(similar.length / similarPageSize));
  const similarPageIdx = Math.min(similarIdx, similarPageCount - 1);
  const rawSimilarStart = similarPageIdx * similarPageSize;
  const similarStart =
    similar.length > similarPageSize && rawSimilarStart + similarPageSize > similar.length
      ? similar.length - similarPageSize
      : rawSimilarStart;

  const achievementRows = useMemo(
    () => achievementsFromCertifications(mentor.certifications),
    [mentor.certifications],
  );

  const hasPortfolioForAchievements = useMemo(() => {
    if (!viewerPortfolio) return false;
    const hasFile = Boolean(viewerPortfolio.portfolioFileName?.trim());
    const url = viewerPortfolio.portfolioUrl?.trim() ?? "";
    const hasUrl = url.length > 0 && /^https?:\/\//i.test(url);
    return hasFile || hasUrl;
  }, [viewerPortfolio]);

  const coverTint = mentor.hasProfilePhoto ? undefined : avatarColorsFromSeed(mentor.name).bg;
  const coverSrc = profileCoverDisplaySrc(mentor.bannerImageUrl);
  const locationLabel = useMemo(
    () => [mentor.city, mentor.country].filter((x) => (x ?? "").trim().length > 0).join(", "),
    [mentor.city, mentor.country],
  );

  return (
    <div className="bg-white pb-16">
      <section className="border-b border-black/[0.06] bg-white">
        <ProfileCover
          imageSrc={coverSrc}
          noImageTintBg={coverTint}
          alt=""
          priority
          readableGradientClassName="bg-gradient-to-t from-black/[0.42] via-black/[0.12] to-transparent"
        />

        <div className={profileHero.inner}>
          <div className={profileHero.row}>
            <div className={profileHero.avatarOuter}>
              <div className={profileHero.avatarRing}>
                <MentorAvatar
                  variant="profile"
                  name={mentor.name}
                  imageUrl={mentor.image}
                  hasProfilePhoto={mentor.hasProfilePhoto}
                  className="size-full rounded-full"
                  sizes="(max-width:640px) 42vw, 184px"
                  priority
                />
              </div>
            </div>

            <div className={profileHero.content}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-10 lg:gap-y-2">
                <div className="flex flex-col gap-2 text-center lg:col-start-1 lg:row-start-1 lg:text-left">
                  <h1 className="font-heading text-[1.35rem] font-semibold tracking-tight text-[#0a0a0a] sm:text-2xl lg:text-[1.75rem]">
                    {mentor.name}
                  </h1>
                  <p className="mx-auto max-w-xl text-[13px] italic leading-relaxed text-[#5c5c66] sm:text-sm lg:mx-0">
                    {mentor.role}
                  </p>
                  {locationLabel ? (
                    <p className="mx-auto max-w-xl text-[12px] leading-relaxed text-neutral-500 sm:text-[13px] lg:mx-0">
                      {locationLabel}
                    </p>
                  ) : null}
                </div>
                {mentor.bio?.trim() ? (
                  <p className="mx-auto max-w-2xl text-center text-[13px] leading-relaxed text-[#3e3e3e] sm:text-sm lg:mx-0 lg:text-left lg:col-start-1 lg:row-start-2">
                    {mentor.bio.trim()}
                  </p>
                ) : null}

                <div className="mb-1 flex flex-col items-center gap-3 sm:mb-2 lg:col-start-2 lg:row-start-1 lg:mb-0 lg:items-end lg:self-start">
                  <div className="flex flex-wrap items-center justify-center gap-2.5 lg:justify-end">
                    <Link
                      href={messageHref}
                      className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-white shadow-md ring-1 ring-primary/20 transition hover:bg-primary/90"
                      aria-label="Message"
                    >
                      <ChatBubbleIcon className="size-[18px] text-white" />
                    </Link>
                    {mentor.linkedinUrl ? (
                      <SocialIconButton
                        href={mentor.linkedinUrl}
                        label="LinkedIn"
                        icon={<LinkedInGlyph profileToolbar brandColor />}
                        className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-white shadow-sm transition hover:bg-primary/5"
                      />
                    ) : null}
                    {viewerSignedIn && viewerHasPendingBookingRequest ? (
                      <div className="flex max-w-[14rem] flex-col gap-1 text-right">
                        <span className="inline-flex items-center justify-center rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-2.5 text-[13px] font-semibold text-amber-950">
                          Session requested
                        </span>
                        <span className="text-[11px] leading-snug text-neutral-600">
                          We’ll email you if this mentor accepts your request.
                        </span>
                      </div>
                    ) : (
                      <Link
                        href={scheduleHref}
                        className="inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-md ring-1 ring-primary/25 transition hover:bg-primary/90"
                      >
                        Book a session
                      </Link>
                    )}
                  </div>
                </div>

                <div
                  className={`mt-5 w-full border-t border-neutral-200/90 pt-5 sm:mt-6 sm:pt-6 lg:col-start-1 lg:max-w-2xl ${
                    mentor.bio?.trim() ? "lg:row-start-3" : "lg:row-start-2"
                  }`}
                >
                  {mentor.summary ? (
                    <div className="flex flex-wrap justify-center gap-x-2 gap-y-2.5 sm:gap-x-2.5 sm:gap-y-3 lg:justify-start">
                      {mentorshipFocusChips(mentor.summary).map((label) => (
                        <span
                          key={label}
                          className="inline-flex max-w-full rounded-full border border-primary/25 bg-primary/[0.08] px-3 py-1.5 text-center text-[12px] font-medium leading-snug text-[#3a3a44] shadow-sm sm:px-3.5 sm:py-2 sm:text-[13px]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-[13px] text-neutral-400 sm:text-sm lg:text-left">&nbsp;</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-3 sm:px-5 md:px-6 lg:px-10">
        <nav className="mt-6 flex gap-5 overflow-x-auto border-b border-black/[0.08] pb-0.5 [-webkit-overflow-scrolling:touch] sm:mt-8 sm:gap-8 md:gap-10">
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
              className={`relative shrink-0 whitespace-nowrap pb-3 text-sm font-semibold transition sm:text-[15px] ${
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
          <div className="mt-6 grid gap-8 sm:mt-8 sm:gap-10 lg:grid-cols-[minmax(0,65%)_minmax(0,35%)] lg:gap-10">
            <div className="space-y-8">
              <div>
                <h2 className={profileSkillsSectionTitle}>Specialization</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {mentor.tags.length > 0 ? (
                    mentor.tags.map((t) => (
                      <span key={t} className={expertisePill}>
                        {t}
                      </span>
                    ))
                  ) : (
                    <p className="text-[13px] text-[#9ca3af]">Expertise will appear here from the mentor profile.</p>
                  )}
                </div>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#0a0a0a]">Experience &amp; Background</h2>
                {experienceLines.length > 0 ? (
                  <ul className="mt-3 list-inside list-disc space-y-1.5 text-[14px] leading-relaxed text-[#374151] marker:text-[#0a0a0a]">
                    {experienceLines.map((line, i) => (
                      <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-[13px] text-[#9ca3af]">Background details from the mentor profile will show here.</p>
                )}
              </div>
              {viewerPortfolio ? (
                <PortfolioViewerPanel
                  userId={viewerPortfolio.userId}
                  portfolioUrl={viewerPortfolio.portfolioUrl}
                  portfolioFileName={viewerPortfolio.portfolioFileName}
                  portfolioVisibleToOthers={viewerPortfolio.portfolioVisibleToOthers}
                  viewerSignedIn={viewerSignedIn}
                  loginHref={portfolioLoginHref}
                />
              ) : null}
            </div>

            <aside className="flex h-fit flex-col gap-4">
              {/**
               * Next Available — placed just above the Statistics card per spec. Seeded from
               * SSR (`mentor.slot`) and kept current by a 45s poll against
               * `/api/mentors/:id/next-slot`, plus an immediate refresh on tab re-focus.
               *
               * UX: show the bare date/time as the primary line (removes the repeated
               * "Next available:" prefix from the server label so the hierarchy reads "NEXT
               * AVAILABLE" → "Friday, 10:00 AM" → pattern). Anonymous viewers still see the
               * value — it's already public on the mentor cards.
               */}
              <section
                aria-label="Next available session"
                className="rounded-[14px] border border-black/10 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CalendarClockIcon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                        Next Available
                      </h2>
                      {nextSlotDisplay.hasUpcoming ? (
                        <span
                          className="inline-flex size-1.5 shrink-0 rounded-full bg-emerald-500 motion-safe:animate-pulse"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <p
                      className="mt-1 break-words text-[15px] font-semibold leading-snug text-[#0a0a0a] sm:text-base"
                      aria-live="polite"
                    >
                      {nextSlotDisplay.headline}
                    </p>
                    {livePattern?.trim() ? (
                      <p className="mt-1 truncate text-[11px] text-neutral-500">{livePattern}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 border-t border-black/[0.06] pt-3">
                  {viewerSignedIn && viewerHasPendingBookingRequest ? (
                    <div className="space-y-1.5 text-center">
                      <span className="inline-flex w-full items-center justify-center rounded-full border border-amber-200/90 bg-amber-50 px-4 py-2.5 text-[13px] font-semibold text-amber-950">
                        Session requested
                      </span>
                      <p className="text-[11px] leading-snug text-neutral-600">
                        We’ll email you if this mentor accepts. You can open the calendar from your profile to see
                        details.
                      </p>
                    </div>
                  ) : (
                    <Link
                      href={scheduleHref}
                      aria-disabled={!nextSlotDisplay.hasUpcoming}
                      className={
                        nextSlotDisplay.hasUpcoming
                          ? "inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary/90"
                          : "inline-flex w-full items-center justify-center rounded-full bg-neutral-100 px-4 py-2.5 text-[13px] font-semibold text-neutral-500"
                      }
                      onClick={(e) => {
                        if (!nextSlotDisplay.hasUpcoming) e.preventDefault();
                      }}
                    >
                      {nextSlotDisplay.hasUpcoming ? "Book this slot" : "No upcoming slots"}
                    </Link>
                  )}
                </div>
              </section>

              <section className="rounded-[14px] border border-black/10 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-base font-semibold text-[#0a0a0a]">Statistics</h2>
              <p className="mb-4 text-[11px] text-[#9ca3af]">
                Totals from completed sessions booked on Commonsia (past end time).
              </p>
              <div className="grid gap-3">
                <div className="flex gap-3 rounded-xl border border-sky-100 bg-sky-50/80 p-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/rocket.svg" alt="" className="icon-black-line size-5 object-contain" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold tabular-nums text-[#0a0a0a]">
                      {formatMentoringMinutesLong(publicBookingStats.totalMentoringMinutes)}
                    </p>
                    <p className="text-[11px] text-[#6b7280]">Total Mentoring Time</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50/80 p-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/session.svg" alt="" className="icon-black-line size-5 object-contain" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold tabular-nums text-[#0a0a0a]">
                      {publicBookingStats.completedSessionCount} Session
                      {publicBookingStats.completedSessionCount === 1 ? "" : "s"}
                    </p>
                    <p className="text-[11px] text-[#6b7280]">Sessions Completed</p>
                  </div>
                </div>
              </div>
              </section>
            </aside>
          </div>
        ) : null}

        {tab === "reviews" ? (
          <div className="mt-8">
            {mentorReviews.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-[#6b7280]">
                No reviews yet. When students complete a session and submit feedback, their reviews appear here in
                real time.
              </p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {mentorReviews.slice(reviewStart, reviewStart + reviewVisible).map((r) => (
                    <article
                      key={r.id}
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
                        <span className="text-sm font-semibold text-primary tabular-nums" title={`${r.rating}/5`}>
                          {r.rating}/5
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
                {mentorReviews.length > reviewVisible ? (
                  <div className="mt-6 flex justify-center">
                    <MentorCarouselArrows
                      ariaPrev="Previous reviews"
                      ariaNext="Next reviews"
                      prevDisabled={reviewStart <= 0}
                      nextDisabled={reviewStart >= maxReviewStart}
                      onPrev={() =>
                        setReviewIdx((i) => {
                          const cur = Math.min(i, maxReviewStart);
                          return Math.max(0, cur - 1);
                        })
                      }
                      onNext={() =>
                        setReviewIdx((i) => {
                          const cur = Math.min(i, maxReviewStart);
                          return Math.min(maxReviewStart, cur + 1);
                        })
                      }
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {tab === "achievements" ? (
          <div className="mt-8 space-y-8">
            {achievementRows.length > 0 ? (
              <section>
                <h2 className="text-base font-semibold text-[#0a0a0a]">Certifications &amp; credentials</h2>
                <ul className="mt-3 space-y-4">
                  {achievementRows.map((a) => (
                    <li
                      key={a.title + a.year}
                      className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-base font-semibold text-[#0a0a0a]">{a.title}</h3>
                        {a.year ? (
                          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
                            {a.year}
                          </span>
                        ) : null}
                      </div>
                      {a.body ? <p className="mt-2 text-sm leading-relaxed text-[#4b5563]">{a.body}</p> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {viewerPortfolio ? (
              <PortfolioViewerPanel
                userId={viewerPortfolio.userId}
                portfolioUrl={viewerPortfolio.portfolioUrl}
                portfolioFileName={viewerPortfolio.portfolioFileName}
                portfolioVisibleToOthers={viewerPortfolio.portfolioVisibleToOthers}
                viewerSignedIn={viewerSignedIn}
                loginHref={portfolioLoginHref}
                className="!mt-0"
              />
            ) : null}
            {achievementRows.length === 0 && !hasPortfolioForAchievements ? (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80 p-5 text-[13px] leading-relaxed text-[#6b7280]">
                <p className="font-medium text-[#0a0a0a]">Nothing listed yet</p>
                <p className="mt-2">
                  Achievements include <strong>certifications and credentials</strong> from mentor profile setup
                  (semicolons or new lines) and any <strong>portfolio</strong> they upload or link when sharing is
                  enabled.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

      </div>

      {/**
       * The "more mentors" section intentionally breaks out of the profile's narrower
       * `max-w-6xl` container and reuses the same `max-w-7xl` wrapper as the `/mentors`
       * directory page. Combined with the matching grid (`lg:grid-cols-2` + `lg:gap-x-8`),
       * this guarantees each suggestion card has the same length, width and internal
       * proportions as a card in the main mentors listing.
       */}
      <section className="mx-auto mt-14 min-w-0 max-w-7xl border-t border-black/[0.06] px-3 pt-10 sm:px-5 md:px-6 lg:px-8">
        <h2 className="text-base font-semibold text-[#0a0a0a]">
          {similarMentorsPersonalized ? "Suggested mentors for you" : "More mentors to explore"}
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
          {similarMentorsPersonalized
            ? "Based on your profile interests and this mentor’s areas of expertise — not a random list."
            : "Ranked by overlap with this mentor’s expertise. Sign in as a student to tailor suggestions to your interests."}
        </p>
        <div className="mt-5 grid min-w-0 auto-rows-fr grid-cols-1 items-stretch gap-3.5 sm:gap-4 md:gap-5 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-5">
          {similar.slice(similarStart, similarStart + similarPageSize).map((m, i) => (
            <MentorCard
              key={`${m.id}-${similarStart}-${i}`}
              mentor={m}
              index={similarStart + i}
              viewerUserId={viewerForSimilarCards}
            />
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <MentorCarouselArrows
            ariaPrev="Previous similar mentors"
            ariaNext="Next similar mentors"
            prevDisabled={similarPageIdx <= 0}
            nextDisabled={similarPageIdx >= similarPageCount - 1}
            onPrev={() => setSimilarIdx((i) => Math.max(0, i - 1))}
            onNext={() => setSimilarIdx((i) => Math.min(similarPageCount - 1, i + 1))}
          />
        </div>
      </section>
    </div>
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

function CalendarClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 10V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <circle cx="17.5" cy="17.5" r="4.5" />
      <path d="M17.5 15.25v2.25l1.5 1" />
    </svg>
  );
}
