"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { MentorAvatar } from "@/components/mentors/MentorAvatar";
import type { Mentor } from "@/lib/mentor-directory";
import { mentorProfileHref } from "@/lib/mentor-slug";

const MAX_SKILL_TAGS_ON_CARD = 5;

/** `spotlight` matches home “What Mentors Say” card min-heights + radius (e.g. similar mentors on profile). */
export function MentorCard({
  mentor,
  index,
  layout = "default",
}: {
  mentor: Mentor;
  index: number;
  layout?: "default" | "spotlight";
}) {
  const { data: session } = useSession();
  const scheduleTarget = `/schedule?mentorUserId=${encodeURIComponent(mentor.id)}`;
  const scheduleHref = session?.user?.id
    ? scheduleTarget
    : `/auth/login?callbackUrl=${encodeURIComponent(scheduleTarget)}`;

  const profileHref = mentorProfileHref(mentor);
  const visibleTags = mentor.tags.slice(0, MAX_SKILL_TAGS_ON_CARD);
  const extraTagCount = mentor.tags.length - visibleTags.length;
  const locationLabel = [mentor.city, mentor.country].filter((x) => (x ?? "").trim().length > 0).join(", ");

  /**
   * Pin every desktop card to the same height so cards match across rows (not just within a
   * row). Heights picked to accommodate the worst-case content at the narrowest 2-col
   * breakpoint (1024px, text column ≈ 270px wide → role on 2 lines + 5 expertise pills
   * wrapping onto 3 lines). Short cards get a small strip of whitespace below the CTA, which
   * is a tiny aesthetic price for perfect uniformity. Mobile keeps a flexible min-height
   * because the layout stacks vertically there, so "uniform height" across cards isn't
   * visible to the user anyway.
   */
  const shellClass =
    layout === "spotlight"
      ? "group relative flex h-full min-h-[17.5rem] w-full min-w-0 flex-col-reverse overflow-hidden rounded-[18px] border border-neutral-200/90 bg-white shadow-[0_16px_40px_-20px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] sm:min-h-[19rem] md:h-[22rem] md:min-h-[22rem] md:flex-row md:items-stretch"
      : "group relative flex h-full min-h-[280px] w-full min-w-0 flex-col-reverse overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-sm ring-1 ring-black/[0.04] md:h-[352px] md:min-h-[352px] md:flex-row md:items-stretch";

  /**
   * Perceived-performance pattern: a full-card invisible `<Link>` (stretched with `absolute
   * inset-0`) lets Next.js prefetch the profile page as the card enters the viewport / on hover,
   * so clicking the card feels instant instead of triggering a fresh SSR round trip. The
   * "Book a session" CTA sits in a higher stacking context and handles its own click.
   */
  return (
    <motion.article
      whileHover={{
        y: -3,
        boxShadow: "0 16px 44px rgba(0,0,0,0.1)",
        transition: { duration: 0.18 },
      }}
      className={shellClass}
    >
      <Link
        href={profileHref}
        prefetch
        aria-label={`View ${mentor.name}'s mentor profile`}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="sr-only">View profile</span>
      </Link>

      {/* Text — fills remaining width; footer pinned to bottom for equal card heights */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-3 p-3.5 sm:p-4 md:py-5 md:pl-5 md:pr-4">
        <div className="min-w-0 space-y-2">
          <div className="space-y-2">
            <h3 className="break-words text-lg font-bold leading-tight tracking-tight text-[#0a0a0a] sm:text-xl">
              {mentor.name}
            </h3>
            <p className="break-words text-[11px] font-medium leading-snug text-neutral-600 sm:text-xs">
              {mentor.role}
            </p>
            {locationLabel ? (
              <p className="break-words text-[11px] font-medium leading-snug text-neutral-500 sm:text-xs">
                {locationLabel}
              </p>
            ) : null}
          </div>
          <div className="min-h-[2.5rem]">
            {mentor.tags.length > 0 ? (
              <div className="mentor-card-tags flex flex-wrap items-center gap-1.5 sm:gap-2">
                {visibleTags.map((t) => (
                  <span key={t} className="mentor-tag-expertise-pill">
                    {t}
                  </span>
                ))}
                {extraTagCount > 0 ? (
                  <span
                    className="mentor-tag-expertise-pill transition hover:brightness-95"
                    aria-label={`View all ${mentor.tags.length} expertise tags on ${mentor.name}'s profile`}
                  >
                    +{extraTagCount} more
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="text-[10px] italic leading-snug text-neutral-400 sm:text-[11px]">Expertise not listed yet</p>
            )}
          </div>
        </div>

        <div className="mt-auto space-y-2 border-t border-neutral-100/90 pt-3">
          <p className="break-words text-[10px] font-medium leading-snug text-neutral-500 sm:text-[11px]">
            {mentor.availabilityPattern}
          </p>
          <p className="break-words text-[10px] font-semibold leading-snug text-neutral-800 sm:text-[11px]">{mentor.slot}</p>
          <Link
            href={scheduleHref}
            className="relative z-20 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-[11px] font-semibold text-white shadow-sm transition group-hover:bg-primary/95 sm:w-fit sm:px-5 sm:text-sm"
          >
            Book a session
          </Link>
        </div>
      </div>

      {/* Photo / initials — fixed width on laptop so column never collapses; full width band on mobile */}
      <div
        className="relative aspect-[5/3] w-full min-h-[168px] max-h-[220px] shrink-0 overflow-hidden rounded-t-xl bg-neutral-100 sm:aspect-[16/10] sm:min-h-[180px] md:aspect-auto md:h-full md:max-h-none md:min-h-[260px] md:w-[min(300px,42%)] md:max-w-[320px] md:shrink-0 md:rounded-none md:rounded-r-xl md:rounded-t-none"
        aria-hidden
      >
        <MentorAvatar
          name={mentor.name}
          imageUrl={mentor.image}
          hasProfilePhoto={mentor.hasProfilePhoto}
          className="rounded-t-xl md:rounded-none md:rounded-r-xl"
          sizes="(max-width:767px) 96vw, 320px"
          priority={index < 2}
        />
      </div>
    </motion.article>
  );
}
