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

export const DIRECTORY_PAGE_SIZE = 10;

export type MentorDirectorySortOrder = "default" | "name-asc" | "name-desc";

export type MentorDirectoryFilters = {
  q: string;
  interests: string[];
  experienceLevel: ExperienceLevelFilter;
  locationFilter: LocationFilter;
  onlyWithAvailability: boolean;
  sortOrder: MentorDirectorySortOrder;
};

export type MentorDirectoryQuery = MentorDirectoryFilters & {
  page: number;
  pageSize: number;
  /**
   * When set, the full roster is shuffled with this seed before filters run — stable across
   * pagination until the client picks a new seed (refresh / tab focus / route entry).
   */
  shuffleSeed?: number;
};

export function defaultMentorDirectoryFilters(): MentorDirectoryFilters {
  return {
    q: "",
    interests: [],
    experienceLevel: "",
    locationFilter: "",
    onlyWithAvailability: false,
    sortOrder: "default",
  };
}

/** Mulberry32 — tiny deterministic PRNG for seeded roster shuffle. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle copy — same ordering for identical `(items, seed)` pairs. */
export function seededShuffleMentors<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice();
  const rnd = mulberry32(seed >>> 0);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Stable serialization for debugging / caches (order-independent interests). */
export function mentorDirectoryQueryKey(q: MentorDirectoryQuery): string {
  const interests = [...q.interests].sort().join("\x1f");
  return [
    q.shuffleSeed ?? "__stable__",
    q.page,
    q.pageSize,
    q.q.trim(),
    interests,
    q.experienceLevel,
    q.locationFilter,
    q.onlyWithAvailability ? "1" : "0",
    q.sortOrder,
  ].join("\x1e");
}

export function applyMentorDirectoryFilters(
  mentors: readonly Mentor[],
  filters: MentorDirectoryFilters,
): Mentor[] {
  const selectedInterests = new Set(filters.interests);
  const passes = (m: Mentor) => {
    if (filters.q.trim() && !mentorMatchesSearchExpanded(m, filters.q)) return false;
    if (!mentorMatchesSelectedInterests(m, selectedInterests)) return false;
    if (!mentorMatchesExperienceLevel(m, filters.experienceLevel)) return false;
    if (!mentorMatchesLocation(m, filters.locationFilter)) return false;
    if (filters.onlyWithAvailability && m.slot.trim() === NO_UPCOMING_AVAILABILITY_LABEL)
      return false;
    return true;
  };
  const list = mentors.filter(passes);
  if (filters.sortOrder === "name-asc") {
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }
  if (filters.sortOrder === "name-desc") {
    return [...list].sort((a, b) => b.name.localeCompare(a.name));
  }
  return list;
}

export function paginateMentorDirectory(
  filtered: readonly Mentor[],
  page: number,
  pageSize: number = DIRECTORY_PAGE_SIZE,
): Mentor[] {
  const safePage = Math.max(1, page);
  const size = Math.max(1, pageSize);
  return filtered.slice((safePage - 1) * size, safePage * size);
}

export function runMentorDirectoryQuery(mentors: readonly Mentor[], query: MentorDirectoryQuery): {
  mentors: Mentor[];
  totalFiltered: number;
  totalAll: number;
} {
  const totalAll = mentors.length;
  const ordered =
    query.shuffleSeed === undefined
      ? mentors.slice()
      : seededShuffleMentors(mentors, query.shuffleSeed);
  const filtered = applyMentorDirectoryFilters(ordered, query);
  const slice = paginateMentorDirectory(filtered, query.page, query.pageSize);
  return { mentors: slice, totalFiltered: filtered.length, totalAll };
}

export function mentorDirectoryTotalPages(totalFiltered: number, pageSize: number = DIRECTORY_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(0, totalFiltered) / Math.max(1, pageSize)));
}

export function parseMentorDirectoryQuery(searchParams: URLSearchParams): MentorDirectoryQuery {
  const rawPage = Number(searchParams.get("page") ?? "1");
  const rawSize = Number(searchParams.get("pageSize") ?? String(DIRECTORY_PAGE_SIZE));
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const pageSize = Number.isFinite(rawSize)
    ? Math.min(50, Math.max(1, Math.floor(rawSize)))
    : DIRECTORY_PAGE_SIZE;

  const q = (searchParams.get("q") ?? "").slice(0, 500);
  const interestsRaw = (searchParams.get("interests") ?? "").trim();
  const interests = interestsRaw
    ? interestsRaw
        .split(",")
        .map((s) => {
          const t = s.trim();
          if (!t) return "";
          try {
            return decodeURIComponent(t);
          } catch {
            return t;
          }
        })
        .filter(Boolean)
        .slice(0, 80)
    : [];

  const exp = (searchParams.get("experience") ?? "").trim();
  const experienceLevel: ExperienceLevelFilter =
    exp === "0-3" || exp === "3-7" || exp === "7+" ? exp : "";

  const loc = (searchParams.get("location") ?? "").trim();
  const locationFilter: LocationFilter =
    loc === "india" || loc === "abroad" ? loc : "";

  const onlyWithAvailability = searchParams.get("avail") === "1";

  const sortRaw = (searchParams.get("sort") ?? "").trim();
  const sortOrder: MentorDirectorySortOrder =
    sortRaw === "name-asc" || sortRaw === "name-desc" ? sortRaw : "default";

  const seedRaw = (searchParams.get("seed") ?? "").trim();
  let shuffleSeed: number | undefined;
  if (seedRaw.length > 0) {
    const n = Number(seedRaw);
    if (Number.isFinite(n)) shuffleSeed = n >>> 0;
  }

  return {
    q,
    interests,
    experienceLevel,
    locationFilter,
    onlyWithAvailability,
    sortOrder,
    page,
    pageSize,
    shuffleSeed,
  };
}

export function buildMentorDirectoryApiUrl(query: MentorDirectoryQuery): string {
  const sp = new URLSearchParams();
  sp.set("page", String(query.page));
  sp.set("pageSize", String(query.pageSize));
  const qt = query.q.trim();
  if (qt) sp.set("q", qt);
  if (query.interests.length > 0) {
    sp.set("interests", query.interests.map((label) => encodeURIComponent(label)).join(","));
  }
  if (query.experienceLevel) sp.set("experience", query.experienceLevel);
  if (query.locationFilter) sp.set("location", query.locationFilter);
  if (query.onlyWithAvailability) sp.set("avail", "1");
  if (query.sortOrder !== "default") sp.set("sort", query.sortOrder);
  if (query.shuffleSeed !== undefined) sp.set("seed", String(query.shuffleSeed >>> 0));
  return `/api/mentors/directory?${sp.toString()}`;
}
