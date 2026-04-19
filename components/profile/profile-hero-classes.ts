/**
 * Single source of truth for profile hero layout (cover + overlapping avatar + content)
 * across student profile, mentor profile, public mentor profile, and mentor-viewing-student.
 */
export const profileHero = {
  inner: "relative z-10 mx-auto max-w-6xl px-3 pb-8 pt-0 sm:px-5 sm:pb-9 md:px-6 md:pb-10 lg:px-10",
  row: "flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8 lg:gap-10",
  /** Pulls avatar up so it straddles cover and content (~half cover height). */
  avatarOuter:
    "-mt-[4.25rem] flex shrink-0 justify-center sm:-mt-[5.125rem] lg:-mt-[5.75rem] sm:justify-start",
  /** ~½ cover height on desktop; matches student/mentor dashboards. */
  avatarRing:
    "relative size-[min(42vw,8.75rem)] overflow-hidden rounded-full bg-neutral-100 ring-[6px] ring-white shadow-[0_10px_36px_rgb(0,0,0,0.14)] sm:size-[10.25rem] md:size-[11rem] lg:size-[11.5rem]",
  content: "min-w-0 flex-1 pt-0.5 sm:pt-[5.5rem] lg:pt-[6rem]",
} as const;

/** Interests / software / specialization headings — same grey tone as mentor card secondary text. */
export const profileSkillsSectionTitle =
  "text-[11px] font-semibold tracking-wide text-neutral-600 sm:text-xs";
