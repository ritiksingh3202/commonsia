import { normalizeMentorYearsBand } from "@/components/mentor/mentor-setup-constants";
import { formatMentorAvailabilityPatternLabel } from "@/lib/mentor-availability-display";
import { MENTOR_PAGE_HERO_ASSETS } from "@/lib/mentor-page-assets";
import {
  extractMentorIdSuffixFromSlug,
  looksLikeRawMentorId,
  mentorIdSuffix,
} from "@/lib/mentor-slug";
import { buildMonthlyWeekdayConsumedMap } from "@/lib/mentor-monthly-booking";
import { formatNextAvailableSlotLine, type NextSlotMonthlyConsumedLookup } from "@/lib/mentor-next-slot";
import { Prisma } from "@prisma/client";

import { CacheKeys, CacheTtl, delKeys, readJsonCache, writeJsonCacheEntry } from "@/lib/redis-cache";
import { withPoolFallback } from "@/lib/db-resilient";
import { prisma } from "@/lib/prisma";
import { getActiveUserWhere, prismaGeneratedClientHasAccountDeletedAt } from "@/lib/user-active";

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
  /**
   * Portfolio link the mentor pasted in their profile (only included when this `Mentor`
   * originates from {@link getPublicMentorById} — the directory grid shape strips it so cards
   * stay small in Redis). May be `null` when the mentor hasn't added one.
   */
  portfolioUrl?: string | null;
  /** Display label for the uploaded portfolio file (PDF/ZIP) when present. */
  portfolioFileName?: string | null;
  /** Mentor's opt-in toggle for sharing the uploaded portfolio with students. */
  portfolioVisibleToOthers?: boolean;
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
  /**
   * Portfolio fields live alongside the rest of the mentor row, so the `/mentors/:id` page
   * no longer needs a second `user.findFirst` just to decide whether to render the viewer
   * portfolio panel. They ride on the same Redis cache entry (`publicMentorProfile:v2:…`)
   * and get invalidated on any `/api/profile` PATCH from the mentor.
   */
  portfolioUrl: true,
  portfolioFileName: true,
  portfolioVisibleToOthers: true,
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
  portfolioUrl?: string | null;
  portfolioFileName?: string | null;
  portfolioVisibleToOthers?: boolean;
};

/**
 * Historic cap for stripping oversized `data:` avatars from the cached list payload. Kept
 * public for back-compat with `trimLargeDataUrlField` users (student dashboard, etc.), but
 * the mentor list + profile pages now *always* route `data:` avatars through the photo
 * proxy regardless of size (see `mapRowToMentor`) — so no base64 blob ever reaches the
 * browser as HTML. Leaving the constant in place keeps existing imports working.
 */
export const MAX_AVATAR_DATA_URL_CHARS = 16_000;

/**
 * Short content-derived tag for cache-busting the photo / banner proxy URLs.
 *
 * When a mentor re-uploads their avatar (or banner) the stored `data:` URL bytes change,
 * so the `?v=` query flips and browsers fetch fresh bytes instead of serving a stale
 * cache. Uses a cheap character-based hash — avoids sha256 of multi-MB strings on every
 * directory render.
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

/**
 * Legacy test / design-handoff rows occasionally stored `www.figma.com/api/mcp/asset/<uuid>`
 * as the mentor avatar. Figma's MCP asset endpoint is not a production CDN: it's slow, rate
 * limited, auth gated, and can go away without notice — rendering from it in the directory
 * blocks the browser on third‑party latency and causes visible image fails when Figma is
 * unreachable. Treat those URLs as "no photo" so the card falls back to the initials avatar
 * (WhatsApp-style coloured circle) instead of hanging on a broken request.
 */
function isUnreliableExternalImageUrl(url: string): boolean {
  const s = url.trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase();
    if (host === "www.figma.com" || host.endsWith(".figma.com")) return true;
  } catch {
    /* non-URL values (data URLs, relative paths) are fine */
  }
  return false;
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
  opts?: {
    /**
     * Deprecated knob — kept to avoid churning every caller. Previously gated whether we
     * inlined the raw `data:` avatar in the cached Mentor payload; today we *always*
     * route `data:` URLs through the photo proxy, so this flag no longer affects the
     * output. Plan to remove once the remaining `allowLargeDataUrlAvatar: true` sites
     * are cleaned up.
     */
    allowLargeDataUrlAvatar?: boolean;
    monthlyConsumed?: Map<string, boolean>;
  },
): Mentor {
  /**
   * Drop any `figma.com` / other unreliable third-party image URLs before they become part
   * of the cached Mentor payload — the card then renders an initials avatar instead of
   * blocking on a slow/broken external fetch. See `isUnreliableExternalImageUrl` for the
   * rationale.
   */
  const rawImgSource = u.image?.trim() ?? "";
  const rawImg = isUnreliableExternalImageUrl(rawImgSource) ? "" : rawImgSource;

  /**
   * Always route `data:` URLs through the avatar proxy, regardless of size. Historically
   * the grid inlined anything ≤ 16 KB and the profile page inlined the raw data URL for
   * *any* size — which meant a mentor with a 500 KB JPEG profile photo shipped ~680 KB of
   * base64 text straight into the SSR HTML of `/mentors/[id]`. With the proxy the HTML
   * only carries a ~40-char URL and the browser pulls the bytes via an immutable, CDN-
   * cacheable GET (see `app/api/mentors/[id]/photo`). HTTPS avatars (OAuth / LinkedIn
   * CDN) still pass through unchanged.
   */
  const isDataUrlAvatar = rawImg.startsWith("data:");
  const avatarSrc = isDataUrlAvatar
    ? `/api/mentors/${u.id}/photo?v=${imageVersionTag(rawImg)}`
    : rawImg;

  /**
   * Same treatment for the cover banner. Banners are up to 500 KB by policy, so inlining
   * was roughly equivalent to sending a second hero image every page load. The new
   * `/api/mentors/:id/banner` route serves the bytes with a 1-year immutable cache.
   */
  const rawBanner = u.bannerImageUrl?.trim() ?? "";
  const bannerSrc = rawBanner.startsWith("data:")
    ? `/api/mentors/${u.id}/banner?v=${imageVersionTag(rawBanner)}`
    : rawBanner || null;

  const tags = expertiseTags(u.mentorExpertise);
  const monthlyLookup: NextSlotMonthlyConsumedLookup | undefined = opts?.monthlyConsumed
    ? (year, monthIndex0) => opts.monthlyConsumed!.get(`${u.id}:${year}-${monthIndex0}`) ?? false
    : undefined;
  const slot = formatNextAvailableSlotLine(u.mentorAvailabilityJson, new Date(), monthlyLookup);
  const availabilityPattern = formatMentorAvailabilityPatternLabel(u.mentorAvailabilityJson);
  const photo = hasStoredProfilePhoto(rawImg);
  const base: Mentor = {
    id: u.id,
    name: displayName(u.name, u.email),
    role: formatRoleLine(u.mentorTitle, u.mentorCompany),
    tags,
    availabilityPattern,
    slot,
    image: heroImage(avatarSrc || null),
    hasProfilePhoto: photo,
    linkedUserId: u.id,
    summary: buildSummary(u),
    experienceLines: buildExperienceLines(u),
    linkedinUrl: u.linkedinUrl?.trim() || null,
    certifications: u.mentorCertifications?.trim() || null,
    bannerImageUrl: bannerSrc,
    onboardingComplete: u.mentorOnboardingComplete,
    yearsExperience:
      normalizeMentorYearsBand(u.mentorYearsExperience) || u.mentorYearsExperience?.trim() || null,
    bio: u.bio?.trim() || null,
  };

  /**
   * Only attach portfolio fields when the caller selected them (profile page uses
   * `mentorSelectFull`; directory uses `mentorSelectDirectory` which omits portfolio to keep
   * the cached list payload small). `undefined` vs `null` lets the consumer tell "mentor has
   * no portfolio" apart from "we didn't fetch it here".
   */
  if ("portfolioUrl" in u || "portfolioFileName" in u || "portfolioVisibleToOthers" in u) {
    base.portfolioUrl = u.portfolioUrl?.trim() || null;
    base.portfolioFileName = u.portfolioFileName?.trim() || null;
    base.portfolioVisibleToOthers = Boolean(u.portfolioVisibleToOthers);
  }

  return base;
}

/**
 * Load the mentor directory.
 *
 * - Single DB roundtrip: only the User findMany runs here. The monthly-booking lookup
 *   used to back the "next slot" label is deliberately skipped for the LIST (it requires
 *   a second query joining 6 months of MentoringBooking rows — useful on the profile page,
 *   wasted work for every card on the grid). Cards now show the next slot derived from the
 *   availability pattern; accuracy against monthly caps happens on the profile page.
 *
 * - Resilient to pool saturation: tries the primary Prisma client (pgbouncer transaction pool
 *   on port 6543). If that throws "Unable to check out connection from the pool due to timeout",
 *   we retry the same query through `prismaDirect` (session pool on 5432, independent pool),
 *   so a saturation event doesn't translate into an empty grid.
 */
/**
 * Directory query: return the scalar mentor fields plus the `image` column ONLY when it's an
 * HTTPS URL. Base64 `data:` URLs are stripped in SQL and replaced with a 10-char md5 prefix;
 * the `mapRowToMentor` below then routes that hash through the `/api/mentors/:id/photo` proxy
 * without ever transferring the bytes over the wire.
 *
 * This is the fix for a performance bug where most mentors stored 100–700 KB base64 avatars
 * directly in `User.image`. A plain `findMany` dragged multiple MB across the Supabase
 * connection on every cache miss — measured at ~27 s per query on the dev link.
 */
type RawMentorListRow = {
  id: string;
  name: string | null;
  email: string | null;
  /** HTTPS URL (OAuth avatar) when non-data. NULL when source was a `data:` URL or empty. */
  image: string | null;
  /** 10-char md5 prefix of the raw `data:` URL — feeds the proxy `?v=` cache-buster. */
  imageDataHash: string | null;
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
};

/** Shape returned by the per-mentor profile `$queryRaw` in `getPublicMentorById`. */
type RawMentorProfileRow = RawMentorListRow & {
  /** HTTPS URL when non-data banner; NULL when source was `data:` or empty. */
  bannerImageUrl: string | null;
  /** 10-char md5 prefix of the raw `data:` banner — feeds `/api/mentors/:id/banner?v=`. */
  bannerImageDataHash: string | null;
  portfolioUrl: string | null;
  portfolioFileName: string | null;
  portfolioVisibleToOthers: boolean;
};

async function fetchPublicMentorsFromDb(): Promise<Mentor[]> {
  const includeSoftDeleteFilter = prismaGeneratedClientHasAccountDeletedAt();
  const softDeleteClause = includeSoftDeleteFilter
    ? Prisma.sql`AND "accountDeletedAt" IS NULL`
    : Prisma.empty;
  const rows = await withPoolFallback(
    (client) =>
      client.$queryRaw<RawMentorListRow[]>`
        SELECT
          "id", "name", "email", "bio",
          "mentorTitle", "mentorCompany", "mentorYearsExperience",
          "mentorExpertise", "mentorMentorshipFocus", "mentorCertifications",
          "mentorAvailabilityJson", "mentorOnboardingComplete", "linkedinUrl",
          CASE
            WHEN "image" LIKE 'data:%' THEN NULL
            ELSE "image"
          END AS "image",
          CASE
            WHEN "image" LIKE 'data:%' THEN substr(md5("image"), 1, 10)
            ELSE NULL
          END AS "imageDataHash"
        FROM "User"
        WHERE "role" = 'mentor'
          AND "mentorOnboardingComplete" = true
          ${softDeleteClause}
        ORDER BY "name" ASC
      `,
    { label: "fetchPublicMentorsFromDb" },
  );
  /**
   * No `monthlyConsumed` — the list slot line is informational; real caps are enforced on book.
   *
   * When the SQL returned a `data:` avatar, `image` is NULL and `imageDataHash` carries the
   * 10-char md5 prefix. We feed `mapRowToMentor` a tiny synthetic `data:proxy;v=<hash>` marker so
   * its existing `data:` → proxy-URL branch runs unchanged and the proxy `?v=` hash still flips
   * when the mentor re-uploads their photo (md5 of the new JPEG ≠ md5 of the old one).
   */
  return rows.map((u) => {
    const syntheticImage =
      u.image ?? (u.imageDataHash ? `data:proxy;v=${u.imageDataHash}` : null);
    return mapRowToMentor(
      {
        ...(u as unknown as MentorRow),
        image: syntheticImage,
        bannerImageUrl: null,
      },
      { monthlyConsumed: undefined },
    );
  });
}

/**
 * Single-flight dedup for the mentor-list DB fetch.
 *
 * When the Redis cache is cold and N requests arrive simultaneously, only ONE runs the
 * Postgres query; the others await the same promise and share the result. Without this,
 * every concurrent cache-miss fires its own `$queryRaw` against Supabase, amplifying a
 * single slow cold-start into a multi-request stampede.
 */
let __inflightFetchPublicMentors: Promise<Mentor[]> | null = null;

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
      /**
       * Single-flight: if another request is already running the DB + Redis-write flow, attach to
       * its promise and share the result — no extra `$queryRaw`, no extra Redis SET.
       */
      if (__inflightFetchPublicMentors) {
        list = await __inflightFetchPublicMentors;
      } else {
        const inflight = (async (): Promise<Mentor[]> => {
          try {
            const fresh = await fetchPublicMentorsFromDb();
            if (Array.isArray(fresh) && fresh.length > 0) {
              try {
                await writeJsonCacheEntry(key, fresh, CacheTtl.publicMentorsList);
              } catch {
                /* best-effort cache write */
              }
            }
            return fresh;
          } finally {
            /** Release the slot only after the write attempt so joiners never see a stale cache. */
            __inflightFetchPublicMentors = null;
          }
        })();
        __inflightFetchPublicMentors = inflight;
        list = await inflight;
      }
    } catch (err) {
      console.warn("[getPublicMentors] DB load failed; falling back to stale Redis (may be empty).", err);
      const stale = await readJsonCache<Mentor[]>(key);
      list = Array.isArray(stale) ? stale : [];
    }
  }

  if (!Array.isArray(list)) list = [];
  /**
   * Defensive dedup by mentor id. The DB schema makes duplicates effectively impossible,
   * but a botched cache write (e.g. two overlapping requests serializing the same list
   * and a third reading a partially-concatenated value) or a future bug could produce a
   * repeated entry. Rendering the same card N times is the single most noticeable visual
   * regression we can cause on `/mentors`, so it's worth the O(n) safety net.
   */
  if (list.length > 1) {
    const seen = new Set<string>();
    const deduped: Mentor[] = [];
    for (const m of list) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      deduped.push(m);
    }
    if (deduped.length !== list.length) {
      console.warn(
        `[getPublicMentors] Dropped ${list.length - deduped.length} duplicate mentor entr${
          list.length - deduped.length === 1 ? "y" : "ies"
        } from cached/fetched list.`,
      );
      list = deduped;
    }
  }
  if (process.env.NODE_ENV === "development") {
    console.info(`[perf] getPublicMentors ${Date.now() - t0}ms (${list.length} mentors)`);
  }
  return list;
}

/**
 * Resolve a URL param (raw CUID or `name-slug-xxxxxx` slug) to the real mentor id.
 *
 * We reuse the Redis-cached `/mentors` list here, so a slug visit is almost always a single
 * Redis GET — no extra DB queries. Raw-id URLs short-circuit immediately for zero overhead.
 */
async function resolveMentorParamToId(param: string): Promise<string | null> {
  const trimmed = param.trim();
  if (!trimmed) return null;
  if (looksLikeRawMentorId(trimmed)) return trimmed;

  const tail = extractMentorIdSuffixFromSlug(trimmed);
  if (!tail) return null;

  const all = await getPublicMentors();
  const suffixLower = tail.toLowerCase();
  for (const m of all) {
    if (mentorIdSuffix(m.id).toLowerCase() === suffixLower) return m.id;
  }
  /** Tail might have been longer than the 6-char canonical suffix — fall back to endsWith. */
  for (const m of all) {
    if (m.id.toLowerCase().endsWith(suffixLower)) return m.id;
  }
  return null;
}

/**
 * Public profile fetch for `/mentors/[slug]`.
 *
 * Accepts either the raw CUID (`cmo9m22g00002jy04tju1odqo`) or a readable slug
 * (`abdul-rehman-u1odqo`). Old shared links keep working unchanged.
 *
 * Perf notes:
 *   - Cached in Redis for 60s keyed per mentor id. Repeat opens of the same profile (common
 *     pattern: student browses back-and-forth between cards) skip all DB + JSON work.
 *   - The User fetch and the 6-month bookings fetch run in parallel via `Promise.all` —
 *     previously they ran sequentially, doubling the time spent on the network roundtrip.
 *   - Pool-aware fallback: if the primary pgbouncer pool throws, we retry the pair on the
 *     session pool via `prismaDirect` so a saturation blip doesn't 404 the page.
 */
export async function getPublicMentorById(param: string): Promise<Mentor | null> {
  const id = await resolveMentorParamToId(param);
  if (!id) return null;

  const cacheKey = CacheKeys.publicMentorProfile(id);
  const cached = await readJsonCache<Mentor>(cacheKey);
  if (cached) return cached;

  const includeSoftDeleteFilter = prismaGeneratedClientHasAccountDeletedAt();
  const softDeleteClause = includeSoftDeleteFilter
    ? Prisma.sql`AND "accountDeletedAt" IS NULL`
    : Prisma.empty;

  const mentor = await withPoolFallback(async (client) => {
    const since = new Date();
    since.setMonth(since.getMonth() - 6);
    /**
     * Same base64-stripping trick as `fetchPublicMentorsFromDb`: return the `image` and
     * `bannerImageUrl` columns only when they are HTTPS URLs, plus a short md5 prefix when
     * they are `data:` URLs. Keeps the profile-page query under a few KB instead of dragging
     * ~1 MB (500 KB avatar + 500 KB banner) across the Supabase connection per open.
     */
    const [rows, bookings] = await Promise.all([
      client.$queryRaw<Array<RawMentorProfileRow>>`
        SELECT
          "id", "name", "email", "bio",
          "mentorTitle", "mentorCompany", "mentorYearsExperience",
          "mentorExpertise", "mentorMentorshipFocus", "mentorCertifications",
          "mentorAvailabilityJson", "mentorOnboardingComplete", "linkedinUrl",
          "portfolioUrl", "portfolioFileName", "portfolioVisibleToOthers",
          CASE
            WHEN "image" LIKE 'data:%' THEN NULL
            ELSE "image"
          END AS "image",
          CASE
            WHEN "image" LIKE 'data:%' THEN substr(md5("image"), 1, 10)
            ELSE NULL
          END AS "imageDataHash",
          CASE
            WHEN "bannerImageUrl" LIKE 'data:%' THEN NULL
            ELSE "bannerImageUrl"
          END AS "bannerImageUrl",
          CASE
            WHEN "bannerImageUrl" LIKE 'data:%' THEN substr(md5("bannerImageUrl"), 1, 10)
            ELSE NULL
          END AS "bannerImageDataHash"
        FROM "User"
        WHERE "id" = ${id}
          AND "role" = 'mentor'
          AND "mentorOnboardingComplete" = true
          ${softDeleteClause}
        LIMIT 1
      `,
      client.mentoringBooking.findMany({
        where: { mentorId: id, startAt: { gte: since } },
        select: { mentorId: true, startAt: true },
      }),
    ]);
    const u = rows[0] ?? null;
    if (!u) return null;
    const monthlyConsumed = buildMonthlyWeekdayConsumedMap(
      [{ id, mentorAvailabilityJson: u.mentorAvailabilityJson }],
      bookings,
    );
    /** Re-hydrate synthetic `data:proxy;v=<hash>` markers so `mapRowToMentor` routes both
     *  the avatar and banner through their proxy routes with a stable cache-busting `?v=`. */
    const syntheticImage =
      u.image ?? (u.imageDataHash ? `data:proxy;v=${u.imageDataHash}` : null);
    const syntheticBanner =
      u.bannerImageUrl ??
      (u.bannerImageDataHash ? `data:proxy;v=${u.bannerImageDataHash}` : null);
    return mapRowToMentor(
      {
        ...(u as unknown as MentorRow),
        image: syntheticImage,
        bannerImageUrl: syntheticBanner,
      },
      { monthlyConsumed },
    );
  }, { label: "getPublicMentorById" });
  if (mentor) {
    try {
      await writeJsonCacheEntry(cacheKey, mentor, CacheTtl.publicMentorProfile);
    } catch {
      /* best-effort cache write */
    }
  }
  return mentor;
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
