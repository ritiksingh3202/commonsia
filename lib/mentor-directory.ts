import { normalizeMentorYearsBand } from "@/components/mentor/mentor-setup-constants";
import { formatMentorAvailabilityPatternLabel } from "@/lib/mentor-availability-display";
import { MENTOR_PAGE_HERO_ASSETS } from "@/lib/mentor-page-assets";
import { buildMonthlyWeekdayConsumedMap } from "@/lib/mentor-monthly-booking";
import { formatNextAvailableSlotLine, type NextSlotMonthlyConsumedLookup } from "@/lib/mentor-next-slot";
import { CacheKeys, CacheTtl, delKeys, readJsonCache, writeJsonCacheEntry } from "@/lib/redis-cache";
import { prisma } from "@/lib/prisma";
import { getActiveUserWhere } from "@/lib/user-active";

/** Public mentor shape for directory cards + profile pages. */
export type Mentor = {
  id: string;
  name: string;
  /** Title + company, e.g. "Assistant Professor, CEPT" */
  role: string;
  tags: string[];
  /** Short rhythm label from saved availability (e.g. "Weekends · IST"). */
  availabilityPattern: string;
  slot: string;
  image: string;
  /** True when the user uploaded or OAuth provided an avatar (not the default placeholder). */
  hasProfilePhoto: boolean;
  /** Same as `id` when backed by a real User — used for messages / schedule. */
  linkedUserId: string | null;
  /** One paragraph under hero on public profile */
  summary: string;
  /** Long-form bio from profile edit (shown under name on public profile). */
  bio: string | null;
  /** Bullets for "Experience & Background" */
  experienceLines: string[];
  /** Public LinkedIn URL when the mentor added one */
  linkedinUrl: string | null;
  /** Raw certifications / credentials string (achievements tab) */
  certifications: string | null;
  /** Custom cover banner (data URL or HTTPS); public profile uses `/profile_cover.png` when null. */
  bannerImageUrl: string | null;
  /** Whether mentor finished onboarding (useful for directory filters). */
  onboardingComplete: boolean;
  /** Saved years band from mentor profile (e.g. `0–2 years`, `2–5 years`). */
  yearsExperience: string | null;
};

/** Full row for a single mentor profile (includes banner — can be large). */
const mentorSelectFull = {
  id: true,
  name: true,
  email: true,
  image: true,
  bio: true,
  mentorTitle: true,
  mentorCompany: true,
  mentorYearsExperience: true,
  mentorExpertise: true,
  mentorMentorshipFocus: true,
  mentorCertifications: true,
  mentorAvailabilityJson: true,
  mentorOnboardingComplete: true,
  linkedinUrl: true,
  bannerImageUrl: true,
} as const;

/**
 * Directory / “similar” list: omit `bannerImageUrl` (often multi‑MB data URLs).
 * Keeps Next.js + Redis payloads small; profile page loads banner via {@link getPublicMentorById}.
 */
const mentorSelectDirectory = {
  id: true,
  name: true,
  email: true,
  image: true,
  bio: true,
  mentorTitle: true,
  mentorCompany: true,
  mentorYearsExperience: true,
  mentorExpertise: true,
  mentorMentorshipFocus: true,
  mentorCertifications: true,
  mentorAvailabilityJson: true,
  mentorOnboardingComplete: true,
  linkedinUrl: true,
} as const;

type MentorRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  mentorTitle: string | null;
  mentorCompany: string | null;
  mentorYearsExperience: string | null;
  mentorExpertise: unknown;
  mentorMentorshipFocus: string | null;
  mentorCertifications: string | null;
  mentorAvailabilityJson: unknown;
  mentorOnboardingComplete: boolean;
  linkedinUrl: string | null;
  bannerImageUrl?: string | null;
};

/** Avoid shipping huge base64 avatars on the `/mentors` grid (cards use a placeholder instead). */
export const MAX_AVATAR_DATA_URL_CHARS = 16_000;

/**
 * Short content-derived tag for cache-busting the photo proxy URL.
 *
 * When a mentor re-uploads their avatar the `image` data-URL bytes change, so the `?v=` query
 * flips and browsers fetch fresh bytes instead of serving a stale 2-minute CDN/browser cache.
 * Uses a cheap character-based hash — avoids sha256 of multi-MB strings on every directory render.
 */
function imageVersionTag(rawImg: string): string {
  let h = 5381;
  const len = rawImg.length;
  const step = Math.max(1, Math.floor(len / 256));
  for (let i = 0; i < len; i += step) {
    h = ((h << 5) + h + rawImg.charCodeAt(i)) | 0;
  }
  /** Mix in length so two images of different sizes never collide on their sampled bytes. */
  return (((h >>> 0) ^ len) >>> 0).toString(36);
}

/** Drop oversized `data:` blobs before JSON APIs or client props (keeps payloads small). */
export function trimLargeDataUrlField(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (v.startsWith("data:") && v.length > MAX_AVATAR_DATA_URL_CHARS) return null;
  return v;
}

function displayName(name: string | null, email: string | null): string {
  const n = name?.trim();
  if (n) return n;
  const local = email?.split("@")[0]?.trim();
  return local || "Mentor";
}

function formatRoleLine(title: string | null, company: string | null): string {
  const t = title?.trim();
  const c = company?.trim();
  if (t && c) return `${t}, ${c}`;
  return t || c || "Mentor";
}

function expertiseTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function heroImage(image: string | null | undefined): string {
  const u = image?.trim();
  if (u) return u;
  return MENTOR_PAGE_HERO_ASSETS.mentorPhoto;
}

/** True when the user row has any stored avatar (OAuth URL or upload), independent of list payload stripping. */
function hasStoredProfilePhoto(rawImage: string | null | undefined): boolean {
  return Boolean(rawImage?.trim());
}

function buildExperienceLines(u: MentorRow): string[] {
  const bullets: string[] = [];
  const title = u.mentorTitle?.trim();
  const company = u.mentorCompany?.trim();
  const years =
    normalizeMentorYearsBand(u.mentorYearsExperience) || u.mentorYearsExperience?.trim() || "";
  const line = [title, company].filter(Boolean).join(", ");
  if (line && years) bullets.push(`${line} (${years})`);
  else if (line) bullets.push(line);
  if (u.mentorCertifications?.trim()) {
    for (const part of u.mentorCertifications.split(/[;\n]/)) {
      const s = part.trim();
      if (s) bullets.push(s);
    }
  }
  const focus = u.mentorMentorshipFocus?.trim();
  if (focus && !bullets.some((b) => b.includes(focus.slice(0, 40)))) {
    bullets.push(focus);
  }
  return bullets.map(spacedListCommas);
}

/** Ensures a space after commas when mentors save comma-separated phrases without spaces (e.g. "A,B"). */
function spacedListCommas(s: string): string {
  return s.replace(/,(\S)/g, ", $1");
}

function buildSummary(u: MentorRow): string {
  const focus = u.mentorMentorshipFocus?.trim();
  if (focus) return focus;
  const bio = u.bio?.trim();
  if (bio) return bio;
  return "";
}

function mapRowToMentor(
  u: MentorRow,
  opts?: { /** Profile page: keep large data-URL avatars; list/grid strips them to save cache size. */
    allowLargeDataUrlAvatar?: boolean;
    monthlyConsumed?: Map<string, boolean>;
  },
): Mentor {
  const rawImg = u.image?.trim() ?? "";
  const listSafeImg =
    opts?.allowLargeDataUrlAvatar || !rawImg.startsWith("data:") || rawImg.length <= MAX_AVATAR_DATA_URL_CHARS
      ? rawImg
      : "";

  /** Large uploads are omitted from cached JSON; cards load the same bytes via this URL (see `app/api/mentors/[id]/photo`). */
  const useAvatarProxy =
    Boolean(rawImg) &&
    !opts?.allowLargeDataUrlAvatar &&
    rawImg.startsWith("data:") &&
    rawImg.length > MAX_AVATAR_DATA_URL_CHARS;

  /** `?v={hash}` busts the browser/CDN cache the instant the mentor re-uploads, so cards update live. */
  const cardImageSrc = useAvatarProxy
    ? `/api/mentors/${u.id}/photo?v=${imageVersionTag(rawImg)}`
    : listSafeImg;

  const tags = expertiseTags(u.mentorExpertise);
  const monthlyLookup: NextSlotMonthlyConsumedLookup | undefined = opts?.monthlyConsumed
    ? (year, monthIndex0) => opts.monthlyConsumed!.get(`${u.id}:${year}-${monthIndex0}`) ?? false
    : undefined;
  const slot = formatNextAvailableSlotLine(u.mentorAvailabilityJson, new Date(), monthlyLookup);
  const availabilityPattern = formatMentorAvailabilityPatternLabel(u.mentorAvailabilityJson);
  const photo = hasStoredProfilePhoto(rawImg);
  return {
    id: u.id,
    name: displayName(u.name, u.email),
    role: formatRoleLine(u.mentorTitle, u.mentorCompany),
    tags,
    availabilityPattern,
    slot,
    image: heroImage(cardImageSrc || null),
    hasProfilePhoto: photo,
    linkedUserId: u.id,
    summary: buildSummary(u),
    experienceLines: buildExperienceLines(u),
    linkedinUrl: u.linkedinUrl?.trim() || null,
    certifications: u.mentorCertifications?.trim() || null,
    bannerImageUrl: u.bannerImageUrl?.trim() || null,
    onboardingComplete: u.mentorOnboardingComplete,
    yearsExperience:
      normalizeMentorYearsBand(u.mentorYearsExperience) || u.mentorYearsExperience?.trim() || null,
    bio: u.bio?.trim() || null,
  };
}

async function fetchPublicMentorsFromDb(): Promise<Mentor[]> {
  const rows = await prisma.user.findMany({
    where: { ...getActiveUserWhere(), role: "mentor", mentorOnboardingComplete: true },
    orderBy: [{ name: "asc" }],
    select: mentorSelectDirectory,
  });
  const since = new Date();
  since.setMonth(since.getMonth() - 6);
  const ids = rows.map((r) => r.id);
  const bookings =
    ids.length === 0
      ? []
      : await prisma.mentoringBooking.findMany({
          where: { mentorId: { in: ids }, startAt: { gte: since } },
          select: { mentorId: true, startAt: true },
        });
  const monthlyConsumed = buildMonthlyWeekdayConsumedMap(rows, bookings);
  return rows.map((u) => mapRowToMentor({ ...(u as MentorRow), bannerImageUrl: null }, { monthlyConsumed }));
}

/**
 * Cached in Redis (not Next data cache) so large mentor sets stay under Next's 2MB limit.
 *
 * Crucially, an empty array is NEVER cached: a transient DB hiccup or a cold start that
 * returned zero rows could otherwise lock the grid into "0 mentors" for the full TTL window.
 * If the cached payload is empty (from an older version or another region) we also retry
 * the DB once — so the site self-heals on the next request instead of waiting for TTL.
 */
export async function getPublicMentors(): Promise<Mentor[]> {
  const key = CacheKeys.publicMentorsList();
  const t0 = Date.now();
  let list: Mentor[];

  const cached = await readJsonCache<Mentor[]>(key);
  if (Array.isArray(cached) && cached.length > 0) {
    list = cached;
  } else {
    if (Array.isArray(cached) && cached.length === 0) {
      /** Stuck empty payload (e.g. from a transient cold start). Drop it before re-fetching so
       *  other instances don't keep serving the bad cache while we rebuild. */
      await delKeys([key]);
    }
    try {
      list = await fetchPublicMentorsFromDb();
    } catch (err) {
      console.warn("[getPublicMentors] DB load failed; falling back to stale Redis (may be empty).", err);
      const stale = await readJsonCache<Mentor[]>(key);
      list = Array.isArray(stale) ? stale : [];
    }
    if (Array.isArray(list) && list.length > 0) {
      /** Only persist non-empty results — an empty list is almost always a symptom, not truth. */
      try {
        await writeJsonCacheEntry(key, list, CacheTtl.publicMentorsList);
      } catch {
        /* best-effort cache write */
      }
    }
  }

  if (!Array.isArray(list)) list = [];
  if (process.env.NODE_ENV === "development") {
    console.info(`[perf] getPublicMentors ${Date.now() - t0}ms (${list.length} mentors)`);
  }
  return list;
}

export async function getPublicMentorById(id: string): Promise<Mentor | null> {
  const u = await prisma.user.findFirst({
    where: { ...getActiveUserWhere(), id, role: "mentor", mentorOnboardingComplete: true },
    select: mentorSelectFull,
  });
  if (!u) return null;
  const since = new Date();
  since.setMonth(since.getMonth() - 6);
  const bookings = await prisma.mentoringBooking.findMany({
    where: { mentorId: id, startAt: { gte: since } },
    select: { mentorId: true, startAt: true },
  });
  const monthlyConsumed = buildMonthlyWeekdayConsumedMap(
    [{ id, mentorAvailabilityJson: u.mentorAvailabilityJson }],
    bookings,
  );
  return mapRowToMentor(u as MentorRow, { allowLargeDataUrlAvatar: true, monthlyConsumed });
}

/**
 * Suggest mentors overlapping the current profile’s expertise and (when logged in as a student)
 * the viewer’s stated interests, software, and major — not a random slice.
 */
export async function getSimilarMentorsForProfile(
  excludeId: string,
  anchor: Mentor,
  studentUserId: string | undefined,
  take = 8,
): Promise<Mentor[]> {
  /**
   * Reuses the Redis-cached `/mentors` list instead of re-querying Prisma + bookings per profile
   * view. Saves a full `user.findMany` + `mentoringBooking.findMany` + monthly-consumed compute
   * on every mentor page open — the slot labels and images are already baked into that list.
   *
   * Student interest lookup still runs (single small query, only when signed in) — fetched in
   * parallel with the list to stay off the critical path.
   */
  const [allMentors, student] = await Promise.all([
    getPublicMentors(),
    studentUserId
      ? prisma.user.findFirst({
          where: { ...getActiveUserWhere(), id: studentUserId, role: "student" },
          select: { interests: true, otherInterests: true, major: true, softwareSkills: true },
        })
      : Promise.resolve(null),
  ]);
  const list = allMentors.filter((m) => m.id !== excludeId);

  const studentPhrases: string[] = [];
  if (studentUserId) {
    const s = student;
    if (s) {
      if (Array.isArray(s.interests)) {
        for (const x of s.interests) {
          if (typeof x === "string" && x.trim()) studentPhrases.push(x.trim().toLowerCase());
        }
      }
      if (s.otherInterests?.trim()) {
        for (const w of s.otherInterests.toLowerCase().split(/[\s,;]+/).filter((x) => x.length > 2)) {
          studentPhrases.push(w);
        }
      }
      if (s.major?.trim()) studentPhrases.push(s.major.trim().toLowerCase());
      if (s.softwareSkills?.trim()) {
        for (const seg of s.softwareSkills
          .split(",")
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean)) {
          studentPhrases.push(seg);
        }
      }
    }
  }
  const studentSet = [...new Set(studentPhrases)];

  const anchorTagSet = new Set(
    anchor.tags.map((t) => t.toLowerCase().trim()).filter((t) => t.length > 0),
  );
  const anchorHay = [...anchor.tags, anchor.summary, ...anchor.experienceLines, anchor.role].join(" ").toLowerCase();
  const anchorWords = new Set(anchorHay.split(/\s+/).filter((w) => w.length > 4));

  function haystack(m: Mentor): string {
    return [
      m.name,
      m.role,
      m.summary,
      ...m.tags,
      ...m.experienceLines,
      m.certifications ?? "",
      m.slot,
      m.linkedinUrl ?? "",
    ]
      .join(" \n ")
      .toLowerCase();
  }

  /** Returns `{ score, sharedTags }` — `sharedTags` is the count of exact tag overlaps with the anchor. */
  function evaluate(m: Mentor): { score: number; sharedTags: number } {
    let sc = 0;
    let sharedTags = 0;
    const hay = haystack(m);
    for (const ph of studentSet) {
      if (ph.length >= 3 && hay.includes(ph)) sc += 5;
    }
    for (const t of m.tags) {
      const tl = t.toLowerCase().trim();
      if (anchorTagSet.has(tl)) {
        /** Exact tag match is the strongest signal — weight it heavily so these rise to the top. */
        sc += 20;
        sharedTags += 1;
      }
      for (const ph of studentSet) {
        if (ph.length >= 3 && (tl.includes(ph) || ph.includes(tl))) sc += 3;
      }
    }
    for (const at of anchor.tags) {
      const al = at.toLowerCase();
      if (al.length >= 3 && hay.includes(al)) sc += 3;
    }
    for (const w of anchorWords) {
      if (hay.includes(w)) sc += 1;
    }
    return { score: sc, sharedTags };
  }

  const scored = list.map((m) => ({ m, ...evaluate(m) }));
  scored.sort((a, b) => b.score - a.score || a.m.name.localeCompare(b.m.name));

  /**
   * Prefer mentors with at least one shared tag — e.g. an "Architectural Design" mentor suggests
   * other "Architectural Design" mentors, not random unrelated profiles. Fall back to top-ranked if
   * tag overlap is too thin to fill the section (small directories, brand-new tags, etc.).
   */
  const MIN_TAG_MATCHED = Math.max(2, Math.min(take, 4));
  const tagMatched = scored.filter((r) => r.sharedTags > 0);
  if (anchorTagSet.size > 0 && tagMatched.length >= MIN_TAG_MATCHED) {
    return tagMatched.slice(0, take).map((r) => r.m);
  }
  return scored.slice(0, take).map((r) => r.m);
}

/** @deprecated Prefer {@link getSimilarMentorsForProfile} for profile pages. */
export async function getSimilarMentorsForPublic(excludeId: string, take = 6): Promise<Mentor[]> {
  const anchor = (await getPublicMentorById(excludeId)) ?? null;
  if (!anchor) {
    const rows = await prisma.user.findMany({
      where: { ...getActiveUserWhere(), role: "mentor", mentorOnboardingComplete: true, NOT: { id: excludeId } },
      orderBy: [{ name: "asc" }],
      take,
      select: mentorSelectDirectory,
    });
    return rows.map((u) => mapRowToMentor({ ...(u as MentorRow), bannerImageUrl: null }));
  }
  return getSimilarMentorsForProfile(excludeId, anchor, undefined, take);
}
