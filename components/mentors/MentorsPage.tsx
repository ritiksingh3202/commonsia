"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MentorCard } from "@/components/mentors/MentorCard";
import { MentorFilterBar } from "@/components/mentors/MentorFilterBar";
import { MentorPagination } from "@/components/mentors/MentorPagination";
import { MentorSearchBar } from "@/components/mentors/MentorSearchBar";
import { SectionReveal } from "@/components/motion/SectionReveal";
import type { Mentor } from "@/lib/mentor-directory";
import {
  mentorMatchesExperienceLevel,
  mentorMatchesLocation,
  mentorMatchesSearchExpanded,
  mentorMatchesSelectedInterests,
  type ExperienceLevelFilter,
  type LocationFilter,
} from "@/lib/mentor-discover-search";
import { NO_UPCOMING_AVAILABILITY_LABEL } from "@/lib/mentor-next-slot";
import { MENTOR_PAGE_HERO_ASSETS } from "@/lib/mentor-page-assets";

const PAGE_SIZE = 10;

type SortOrder = "default" | "name-asc" | "name-desc";

export function MentorsPage({ mentors }: { mentors: Mentor[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(() => new Set());
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevelFilter>("");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("");
  const [onlyWithAvailability, setOnlyWithAvailability] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");

  const selectedInterestsKey = useMemo(
    () => [...selectedInterests].sort().join("|"),
    [selectedInterests],
  );

  const [page, setPage] = useState(1);
  const pageRef = useRef(page);
  const resultsAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  const lastTabRefreshRef = useRef(0);

  const scrollResultsIntoView = () => {
    requestAnimationFrame(() => {
      resultsAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const filtered = useMemo(() => {
    const passes = (m: Mentor) => {
      if (q.trim() && !mentorMatchesSearchExpanded(m, q)) return false;
      if (!mentorMatchesSelectedInterests(m, selectedInterests)) return false;
      if (!mentorMatchesExperienceLevel(m, experienceLevel)) return false;
      if (!mentorMatchesLocation(m, locationFilter)) return false;
      if (onlyWithAvailability && m.slot.trim() === NO_UPCOMING_AVAILABILITY_LABEL) return false;
      return true;
    };
    const list = mentors.filter(passes);
    if (sortOrder === "name-asc") {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortOrder === "name-desc") {
      return [...list].sort((a, b) => b.name.localeCompare(a.name));
    }
    return list;
  }, [
    mentors,
    q,
    selectedInterests,
    experienceLevel,
    locationFilter,
    onlyWithAvailability,
    sortOrder,
  ]);

  const hasActiveFilters =
    selectedInterests.size > 0 ||
    Boolean(experienceLevel) ||
    Boolean(locationFilter) ||
    onlyWithAvailability ||
    sortOrder !== "default";

  const activeFilterCount =
    selectedInterests.size +
    (experienceLevel ? 1 : 0) +
    (locationFilter ? 1 : 0) +
    (onlyWithAvailability ? 1 : 0) +
    (sortOrder !== "default" ? 1 : 0);

  const clearFilters = useCallback(() => {
    setSelectedInterests(new Set());
    setExperienceLevel("");
    setLocationFilter("");
    setOnlyWithAvailability(false);
    setSortOrder("default");
  }, []);

  const toggleInterest = useCallback((label: string) => {
    setSelectedInterests((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- keep page in range when filtered result count changes */
    setPage((p) => (p > totalPages ? totalPages : p < 1 ? 1 : p));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [totalPages]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset to first page when search or filters change */
    setPage(1);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [q, selectedInterestsKey, experienceLevel, locationFilter, onlyWithAvailability, sortOrder]);

  /** Entering /mentors (navbar or link) should show the hero from the top — not auto-scroll to the search block. */
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const safePage = Math.min(page, totalPages);

  /** Fresh mentor rows when returning to the tab (throttled — server still renders with `force-dynamic`). */
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastTabRefreshRef.current < 45_000) return;
      lastTabRefreshRef.current = now;
      router.refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [router]);

  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="bg-white pb-6 sm:pb-8">
      {/* Hero — same proportions / rhythm as home (padding, type scale, CTAs, side art) */}
      {/* Hero title wraps with text-balance — no forced nowrap so long lines never clip */}
      <section className="relative overflow-x-hidden bg-[#ffffff] px-4 pb-3 pt-8 sm:px-6 sm:pb-4 sm:pt-10 lg:flex lg:min-h-[calc(100svh-4.75rem)] lg:flex-col lg:justify-center lg:px-8 lg:pb-5 lg:pt-10 xl:pb-6 xl:pt-12">
        <div className="relative mx-auto w-full max-w-[100rem] min-w-0 px-3 sm:px-5 lg:px-10">
          <motion.div
            className="absolute left-0 top-[18%] z-10 hidden w-[100px] md:block lg:top-[22%] lg:w-[140px] xl:top-[26%] xl:w-[180px] 2xl:w-[200px]"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="relative aspect-[3/5] w-full">
              <Image
                src={MENTOR_PAGE_HERO_ASSETS.leftFigure}
                alt=""
                fill
                className="object-contain object-bottom object-center"
                sizes="240px"
              />
            </div>
          </motion.div>

          <div className="relative z-20 mx-auto flex w-full min-w-0 max-w-2xl flex-col items-center justify-center px-2 text-center sm:max-w-4xl sm:px-3 lg:max-w-5xl xl:max-w-[65rem] 2xl:max-w-[75rem]">
            <motion.div
              className="relative mb-3 flex w-full max-w-[min(100%,360px)] justify-center sm:mb-3 sm:max-w-[400px]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
            >
              <div className="relative h-10 w-full sm:h-12">
                <Image
                  src={MENTOR_PAGE_HERO_ASSETS.topStrip}
                  alt=""
                  fill
                  className="object-contain object-center"
                  sizes="(max-width:640px) 360px, 420px"
                  priority
                />
              </div>
            </motion.div>
            <motion.p
              className="text-[11px] font-normal text-neutral-600 sm:text-xs lg:text-[13px]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.09 }}
            >
              The Community Platform for Architecture Students
            </motion.p>

            <motion.h1
              className="mx-auto mt-3 flex w-full min-w-0 max-w-[1117px] flex-col items-center gap-y-1.5 px-3 text-center text-[clamp(1.25rem,4.2vw+0.35rem,2rem)] font-semibold leading-[1.22] tracking-tight sm:mt-3 sm:gap-y-2 sm:px-4 sm:text-[2.1rem] sm:leading-[1.18] md:gap-y-2 md:text-[2.65rem] md:leading-[1.16] lg:text-[3rem] lg:leading-[1.14] xl:text-[3.35rem] 2xl:text-[3.6rem]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Mobile / tablet: lines may wrap; lg+: one line each (desktop) */}
              <span className="block w-full max-w-full text-balance break-words [overflow-wrap:anywhere] xl:whitespace-nowrap">
                <span className="text-[#0a0a0a]">Stuck in Your </span>
                <span className="text-primary">Design Journey?</span>
              </span>
              <span className="block w-full max-w-full text-balance break-words [overflow-wrap:anywhere] xl:whitespace-nowrap">
                <span className="text-[#0a0a0a]">Find a </span>
                <span className="text-primary">Mentor</span>
                <span className="text-[#0a0a0a]">.</span>
              </span>
            </motion.h1>

            <p className="mx-auto mt-3 max-w-4xl text-pretty text-center text-[13px] leading-snug text-neutral-600 sm:mt-4 sm:text-[15px] sm:leading-relaxed lg:text-[16px]">
              Connect with experienced architects, professors, and industry experts who
              guide you through design, portfolios, or real-world projects.
            </p>

            <motion.div
              className="mt-4 flex w-full max-w-sm flex-col items-center justify-center gap-2.5 sm:mt-5 sm:max-w-none sm:flex-row sm:gap-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Link
                href="/mentors"
                className="w-full rounded-full bg-primary px-7 py-2.5 text-center text-[14px] font-semibold tracking-wide text-white shadow-md transition-all hover:scale-[1.03] hover:shadow-lg sm:w-auto sm:px-9 sm:py-3 sm:text-[15px]"
              >
                Find a Mentor
              </Link>
              <Link
                href="/auth"
                className="w-full rounded-full border-2 border-primary bg-white px-7 py-2.5 text-center text-[14px] font-semibold tracking-wide text-primary transition-all hover:scale-[1.03] hover:bg-primary/5 sm:w-auto sm:px-9 sm:py-3 sm:text-[15px]"
              >
                Become a Mentor
              </Link>
            </motion.div>
          </div>

          <motion.div
            className="absolute right-0 top-[18%] z-10 hidden w-[100px] md:block lg:top-[22%] lg:w-[140px] xl:top-[26%] xl:w-[180px] 2xl:w-[200px]"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="relative aspect-[3/5] w-full">
              <Image
                src={MENTOR_PAGE_HERO_ASSETS.rightFigure}
                alt=""
                fill
                className="object-contain object-bottom object-center"
                sizes="240px"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <div ref={resultsAnchorRef} className="mx-auto min-w-0 max-w-6xl scroll-mt-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 flex-row items-stretch gap-3 sm:items-center sm:gap-4">
            <MentorSearchBar
              className="min-w-0 flex-1"
              value={q}
              onChange={(v) => {
                const wasNotFirstPage = pageRef.current !== 1;
                setQ(v);
                setPage(1);
                if (wasNotFirstPage) scrollResultsIntoView();
              }}
            />
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white shadow-sm ring-1 ring-primary/25 transition hover:bg-primary/95 active:scale-[0.98]"
              aria-expanded={filtersOpen}
              aria-controls="mentor-filters-panel"
            >
              Filter
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`shrink-0 transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`}
                aria-hidden
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
              {activeFilterCount > 0 ? (
                <span className="flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-white/25 px-1.5 text-[11px] font-bold leading-none text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>
          <MentorFilterBar
            filtersOpen={filtersOpen}
            selectedInterestLabels={selectedInterests}
            onToggleInterest={toggleInterest}
            experienceLevel={experienceLevel}
            onExperienceLevel={setExperienceLevel}
            locationFilter={locationFilter}
            onLocationFilter={setLocationFilter}
            onlyWithAvailability={onlyWithAvailability}
            onOnlyWithAvailability={setOnlyWithAvailability}
            sortOrder={sortOrder}
            onSortOrder={setSortOrder}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        <SectionReveal className="mt-5 sm:mt-6">
          {mentors.length > 0 ? (
            <p className="mb-3 text-[12px] text-neutral-500">
              {filtered.length === mentors.length
                ? `Showing all ${filtered.length} mentor${filtered.length === 1 ? "" : "s"}`
                : `Showing ${filtered.length} of ${mentors.length} mentor${mentors.length === 1 ? "" : "s"}`}
            </p>
          ) : null}
          <div className="grid min-w-0 grid-cols-1 items-stretch gap-3.5 sm:gap-4 lg:grid-cols-2 lg:gap-5 lg:gap-x-6">
            {slice.map((m, i) => (
              <MentorCard key={m.id} mentor={m} index={i} />
            ))}
          </div>
          {filtered.length === 0 && mentors.length > 0 && (
            <p className="py-5 text-center text-sm text-neutral-600 sm:py-6">
              No mentors match your search and filters. Try different keywords or clear filters.
            </p>
          )}
          {mentors.length === 0 && (
            <p className="py-5 text-center text-sm text-neutral-600 sm:py-6">
              No mentors are listed yet. Check back soon.
            </p>
          )}
        </SectionReveal>

        {filtered.length > 0 && (
          <MentorPagination
            page={safePage}
            total={totalPages}
            onPageChange={(p) => {
              setPage(p);
              scrollResultsIntoView();
            }}
          />
        )}
      </div>
    </div>
  );
}
