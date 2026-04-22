"use client";

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

const PAGE_SIZE = 10;

type SortOrder = "default" | "name-asc" | "name-desc";

export function MentorsPage({ mentors }: { mentors: Mentor[] }) {
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

  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (mentors.length === 0) {
    return (
      <div className="bg-white pb-16 sm:pb-20">
        <div className="mx-auto min-w-0 max-w-2xl px-4 pt-10 text-center sm:px-6 sm:pt-14 md:pt-16">
          <p className="font-sans text-[15px] font-semibold leading-normal text-[#6a7282] sm:text-base">
            Connect, gain mentorship, and learn from real world practice.
          </p>
          <div className="mt-8 rounded-2xl border border-neutral-200/90 bg-gradient-to-b from-orange-50/40 to-white px-6 py-10 shadow-sm sm:mt-10 sm:px-8 sm:py-12">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Mentors</p>
            <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-[#0a0a0a] sm:text-3xl">
              Coming soon
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-600 sm:text-base">
              We&apos;re onboarding mentors now. Once the first mentor profile is live, you&apos;ll see their cards
              here. Sign up or check back shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white pb-6 sm:pb-8">
      <div id="results" ref={resultsAnchorRef} className="mx-auto min-w-0 max-w-7xl scroll-mt-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-col gap-5 pt-6 sm:gap-6 sm:pt-8 md:pt-10">
          <p className="w-full text-left font-sans text-[15px] font-semibold leading-normal text-[#6a7282] sm:text-base">
            Connect, gain mentorship, and learn from real world practice.
          </p>

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
        </div>

        <SectionReveal className="mt-5 sm:mt-6">
          {mentors.length > 0 ? (
            <p className="mb-3 text-[12px] text-neutral-500">
              {filtered.length === mentors.length
                ? `Showing all ${filtered.length} mentor${filtered.length === 1 ? "" : "s"}`
                : `Showing ${filtered.length} of ${mentors.length} mentor${mentors.length === 1 ? "" : "s"}`}
            </p>
          ) : null}
          <div className="grid min-w-0 auto-rows-fr grid-cols-1 items-stretch gap-3.5 sm:gap-4 md:gap-5 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-5">
            {slice.map((m, i) => (
              <MentorCard key={m.id} mentor={m} index={i} />
            ))}
          </div>
          {filtered.length === 0 && mentors.length > 0 && (
            <p className="py-5 text-center text-sm text-neutral-600 sm:py-6">
              No mentors match your search and filters. Try different keywords or clear filters.
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
