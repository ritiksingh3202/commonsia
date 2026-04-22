"use client";

import { ARCHITECTURE_INTEREST_GROUPS } from "@/components/shared/architecture-taxonomy";
import {
  type ExperienceLevelFilter,
  type LocationFilter,
} from "@/lib/mentor-discover-search";

type SortOrder = "default" | "name-asc" | "name-desc";

type Props = {
  filtersOpen: boolean;
  selectedInterestLabels: ReadonlySet<string>;
  onToggleInterest: (label: string) => void;
  experienceLevel: ExperienceLevelFilter;
  onExperienceLevel: (v: ExperienceLevelFilter) => void;
  locationFilter: LocationFilter;
  onLocationFilter: (v: LocationFilter) => void;
  onlyWithAvailability: boolean;
  onOnlyWithAvailability: (v: boolean) => void;
  sortOrder: SortOrder;
  onSortOrder: (v: SortOrder) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
};

export function MentorFilterBar({
  filtersOpen,
  selectedInterestLabels,
  onToggleInterest,
  experienceLevel,
  onExperienceLevel,
  locationFilter,
  onLocationFilter,
  onlyWithAvailability,
  onOnlyWithAvailability,
  sortOrder,
  onSortOrder,
  onClearFilters,
  hasActiveFilters,
}: Props) {
  return (
    <div className="mt-3 w-full min-w-0">
      {filtersOpen ? (
        <div
          id="mentor-filters-panel"
          className="space-y-5 rounded-xl border border-black/[0.08] bg-neutral-50/80 p-4 sm:p-5"
        >
          {hasActiveFilters ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClearFilters}
                className="text-[12px] font-semibold text-primary underline-offset-2 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : null}

          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Area of interest</p>
            {ARCHITECTURE_INTEREST_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="text-[11px] font-medium text-neutral-600">{group.title}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {group.items.map((label) => {
                    const on = selectedInterestLabels.has(label);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => onToggleInterest(label)}
                        className={`max-w-full rounded-full border px-3 py-1.5 text-left text-[11px] font-medium leading-snug transition sm:text-[12px] ${
                          on
                            ? "border-primary bg-primary text-white shadow-sm"
                            : "border-black/[0.1] bg-white text-[#374151] hover:border-primary/40"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Experience level</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["", "Any"],
                  ["0-3", "0–3 yrs"],
                  ["3-7", "3–7 yrs"],
                  ["7+", "7+ yrs"],
                ] as const
              ).map(([id, label]) => {
                const active = experienceLevel === id;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onExperienceLevel(id)}
                    className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
                      active
                        ? "border-primary bg-primary text-white shadow-sm"
                        : "border-black/[0.1] bg-white text-[#374151] hover:border-primary/40"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Location</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["", "Any"],
                  ["india", "India"],
                  ["abroad", "Abroad"],
                ] as const
              ).map(([id, label]) => {
                const active = locationFilter === id;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onLocationFilter(id)}
                    className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
                      active
                        ? "border-primary bg-primary text-white shadow-sm"
                        : "border-black/[0.1] bg-white text-[#374151] hover:border-primary/40"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-black/[0.06] pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Sort</p>
            <label className="mt-2 block max-w-xs">
              <span className="sr-only">Sort mentors</span>
              <select
                value={sortOrder}
                onChange={(e) => onSortOrder(e.target.value as SortOrder)}
                className="h-10 w-full rounded-xl border border-black/[0.1] bg-white px-3 text-base font-medium text-[#1a1a1a] shadow-sm outline-none ring-primary/20 focus:ring-2 sm:text-[13px]"
              >
                <option value="default">Default (list order)</option>
                <option value="name-asc">Name (A–Z)</option>
                <option value="name-desc">Name (Z–A)</option>
              </select>
            </label>
          </div>

          <div>
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-[#374151]">
              <input
                type="checkbox"
                checked={onlyWithAvailability}
                onChange={(e) => onOnlyWithAvailability(e.target.checked)}
                className="size-4 rounded border-neutral-300 text-primary focus:ring-primary"
              />
              <span>Has upcoming availability</span>
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
