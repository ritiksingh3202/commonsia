"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { MentorAvatar } from "@/components/mentors/MentorAvatar";
import type { Mentor } from "@/lib/mentor-directory";

const MAX_SKILL_TAGS_ON_CARD = 5;

export function MentorCard({
  mentor,
  index,
}: {
  mentor: Mentor;
  index: number;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const scheduleTarget = `/schedule?mentorUserId=${encodeURIComponent(mentor.id)}`;
  const scheduleHref = session?.user?.id
    ? scheduleTarget
    : `/auth/login?callbackUrl=${encodeURIComponent(scheduleTarget)}`;

  const profileHref = `/mentors/${mentor.id}`;
  const visibleTags = mentor.tags.slice(0, MAX_SKILL_TAGS_ON_CARD);
  const extraTagCount = mentor.tags.length - visibleTags.length;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{
        y: -4,
        boxShadow: "0 16px 44px rgba(0,0,0,0.1)",
        transition: { duration: 0.2 },
      }}
      role="link"
      tabIndex={0}
      onClick={() => router.push(profileHref)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(profileHref);
        }
      }}
      className="group flex h-full min-h-[280px] w-full min-w-0 flex-col-reverse overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-sm ring-1 ring-black/[0.04] md:min-h-[300px] md:flex-row md:items-stretch"
    >
      {/* Text — fills remaining width; footer pinned to bottom for equal card heights */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-3 p-3.5 sm:p-4 md:py-5 md:pl-5 md:pr-4">
        <div className="min-w-0 space-y-2">
          <div>
            <h3 className="break-words text-lg font-bold leading-tight tracking-tight text-[#0a0a0a] sm:text-xl">
              {mentor.name}
            </h3>
            <p className="mt-0.5 break-words text-[11px] font-medium leading-snug text-neutral-600 sm:text-xs">
              {mentor.role}
            </p>
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
                  <Link
                    href={profileHref}
                    onClick={(e) => e.stopPropagation()}
                    className="mentor-tag-expertise-pill transition hover:brightness-95"
                    aria-label={`View all ${mentor.tags.length} expertise tags on ${mentor.name}'s profile`}
                  >
                    +{extraTagCount} more
                  </Link>
                ) : null}
              </div>
            ) : (
              <p className="text-[10px] italic leading-snug text-neutral-400 sm:text-[11px]">Expertise not listed yet</p>
            )}
          </div>
        </div>

        <div className="mt-auto space-y-2 border-t border-neutral-100/90 pt-3">
          <p className="break-words text-[10px] font-semibold leading-snug text-neutral-800 sm:text-[11px]">{mentor.slot}</p>
          <Link
            href={scheduleHref}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-[11px] font-semibold text-white shadow-sm transition group-hover:bg-primary/95 sm:w-fit sm:px-5 sm:text-sm"
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
          priority={index < 8}
        />
      </div>
    </motion.article>
  );
}
