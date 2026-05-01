import { revalidateTag } from "next/cache";
import { Redis } from "@upstash/redis";

/** Next.js Data Cache tag — pair with `unstable_cache` on `/mentors` and `revalidateTag` on list bust. */
export const PUBLIC_MENTORS_REVALIDATE_TAG = "public-mentors-list";

/**
 * Optional Upstash Redis (HTTP) for short-lived JSON caching on hot API routes.
 * If `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are unset, all helpers no-op
 * and the app behaves as before.
 *
 * @see https://vercel.com/marketplace/upstash
 */
let redisSingleton: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisSingleton !== undefined) return redisSingleton;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    redisSingleton = null;
    return null;
  }
  redisSingleton = new Redis({ url, token });
  return redisSingleton;
}

const PREFIX = "commonsia:v1";

export const CacheKeys = {
  /** Bump suffix when dashboard JSON shape/size changes (avoids serving stale multi‑MB cache). */
  studentDashboard: (userId: string) => `${PREFIX}:dashboard:student:v2:${userId}`,
  chatThreads: (userId: string) => `${PREFIX}:chat:threads:${userId}`,
  sessionWithMentor: (studentId: string, mentorUserId: string) =>
    `${PREFIX}:session:${studentId}:${mentorUserId}`,
  mentorSlots: (mentorUserId: string, year: number, month: number, day: number) =>
    `${PREFIX}:slots:${mentorUserId}:${year}-${month}-${day}`,
  /** `month` is 0–11 (JavaScript month index), matching `/api/schedule/mentor-month-availability`. */
  mentorMonthAvailability: (mentorUserId: string, year: number, month: number) =>
    `${PREFIX}:monthavail:${mentorUserId}:${year}-${month}`,
  /**
   * Public `/mentors` grid — slim payload (no banner blobs); Redis avoids Next.js 2MB
   * data-cache limit. Bumped to `v5` when we switched every `data:` avatar + banner to
   * the `/api/mentors/:id/{photo,banner}` proxy so old entries (which still inlined
   * ≤16 KB data URLs) don't linger for 5 minutes post-deploy.
   */
  publicMentorsList: () => `${PREFIX}:mentors:public-list:v5`,
  /**
   * Individual public mentor profile — cached JSON for `/mentors/[id]` SSR.
   * Bumped to `v3` when the payload stopped carrying raw `data:` URLs for `image` and
   * `bannerImageUrl` (entries were 500 KB+ before; now <1 KB). Old v2 entries would
   * still render correctly but defeat the perf win for the first 60 s after deploy.
   */
  publicMentorProfile: (id: string) => `${PREFIX}:mentors:public-profile:v3:${id}`,
  /** Public booking totals shown on a mentor's profile (completed sessions + minutes). */
  publicMentorBookingStats: (id: string) =>
    `${PREFIX}:mentors:public-booking-stats:v1:${id}`,
  /** Binary mentor photo bytes keyed by content-hash version from the URL's `?v=` param. */
  mentorPhotoBlob: (id: string, version: string) =>
    `${PREFIX}:mentors:photo:${id}:${version}`,
  /**
   * Binary mentor banner (cover) bytes keyed by content-hash version. Same cache-busting
   * pattern as `mentorPhotoBlob`: when the mentor re-uploads a cover the `?v=` token
   * changes, so the new URL misses this key and re-reads from Postgres. Keeps Redis + the
   * browser CDN perfectly coherent without a manual invalidation.
   */
  mentorBannerBlob: (id: string, version: string) =>
    `${PREFIX}:mentors:banner:${id}:${version}`,
  /** Short-lived NX lock to reduce double-booking the same mentor slot (see `tryAcquireSlotBookingLock`). */
  bookingSlotLock: (mentorUserId: string, startIso: string) =>
    `${PREFIX}:lock:slot:${mentorUserId}:${startIso}`,
  /**
   * Ephemeral copy of `BookingRequest` action raw token (DB stores hash only). Used to sign catalog
   * links when the mentor taps WhatsApp quick-reply "Accept" (no signed token in the message).
   */
  bookingActionRawToken: (bookingRequestId: string) => `${PREFIX}:booking:rawtok:v1:${bookingRequestId}`,
  /** Navbar notification bell summary per user — 15s TTL, invalidated on chat/booking events. */
  notificationsSummary: (userId: string) => `${PREFIX}:notif:summary:v1:${userId}`,
} as const;

export const CacheTtl = {
  studentDashboard: 30,
  chatThreads: 12,
  sessionWithMentor: 8,
  /** Availability + Google free/busy — keep warm to cut repeat Google calls. */
  mentorSlots: 120,
  mentorMonthAvailability: 180,
  /** Mentor directory list — safe to cache longer (invalidated on mentor profile / signup). */
  publicMentorsList: 300,
  /** Public mentor profile — short but helpful: serialize once per 60s instead of per request. */
  publicMentorProfile: 60,
  /** Public booking totals — only change after a session ends; bookings APIs also invalidate explicitly. */
  publicMentorBookingStats: 90,
  /** Mentor photo blob — URL is content-hashed, so entries are immutable for their TTL window. */
  mentorPhotoBlob: 60 * 60 * 24 * 7,
  /** Mentor banner blob — same immutability contract as the photo blob. */
  mentorBannerBlob: 60 * 60 * 24 * 7,
} as const;

/** CDN / browser hint for schedule JSON (pairs with removing `cache: "no-store"` on the client). */
export const SCHEDULE_API_CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=120";

async function readJson<T>(key: string): Promise<T | undefined> {
  const r = getRedis();
  if (!r) return undefined;
  try {
    const raw = await r.get<unknown>(key);
    if (raw == null || raw === "") return undefined;
    // @upstash/redis applies automatic JSON deserialization on GET — value is often already an object.
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return undefined;
      }
    }
    return raw as T;
  } catch {
    return undefined;
  }
}

/** Same as internal read, without the GET race timeout — for stale fallbacks after DB errors. */
export async function readJsonCache<T>(key: string): Promise<T | undefined> {
  return readJson<T>(key);
}

async function writeJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, value, { ex: ttlSeconds });
  } catch {
    /* ignore cache write failures */
  }
}

/** Direct write to Redis (for callers that manage their own read-through logic — e.g. skipping empty results). */
export async function writeJsonCacheEntry(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  return writeJson(key, value, ttlSeconds);
}

/**
 * Read a cached binary blob (mentor photo bytes, etc.). Upstash has no native binary type —
 * we store `{ b: base64, m: mime, e: etag }` JSON and decode on the way out. Tiny overhead vs.
 * re-parsing a 60 KB `data:` URL from Postgres on every request.
 *
 * `bytes` is an `ArrayBuffer` so it can be passed directly to `NextResponse` / the Fetch
 * `Body` type without TypeScript's `Uint8Array<ArrayBufferLike>` variance issues
 * (Next 16 + TS 5.7 tightened these).
 */
export type BlobCacheEntry = { bytes: ArrayBuffer; mime: string; etag: string };

export async function readBlobCache(key: string): Promise<BlobCacheEntry | undefined> {
  const raw = await readJson<{ b: string; m: string; e: string }>(key);
  if (!raw || typeof raw.b !== "string") return undefined;
  try {
    const buf = Buffer.from(raw.b, "base64");
    /** `buf.buffer` may be pooled — slice to get an isolated, cacheable ArrayBuffer. */
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    return { bytes: ab, mime: raw.m, etag: raw.e };
  } catch {
    return undefined;
  }
}

export async function writeBlobCache(
  key: string,
  entry: BlobCacheEntry,
  ttlSeconds: number,
): Promise<void> {
  const b = Buffer.from(entry.bytes).toString("base64");
  return writeJson(key, { b, m: entry.mime, e: entry.etag }, ttlSeconds);
}

/**
 * Read-through cache: returns cached JSON or runs `fetcher` and stores the result.
 * Does not cache `null` / `undefined` (avoids persisting error or forbidden-shaped responses).
 *
 * Redis GET is awaited directly (no artificial timeout race): a slow-but-successful hit
 * must not be mistaken for a miss — the old `Promise.race` pattern could wait 2.2s then
 * still hit the DB and ignore a late cache response, which made `/mentors` feel very slow.
 * Writes are fire-and-forget so a large SET does not delay the HTTP response after the DB read.
 */
export async function withJsonCache<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = await readJson<T>(key);
  if (hit !== undefined) return hit;
  const fresh = await fetcher();
  if (fresh != null) {
    void writeJson(key, fresh, ttlSeconds);
  }
  return fresh;
}

const BOOKING_ACTION_RAW_TOKEN_TTL_SEC = 60 * 60 * 24 * 14;

/** Mirror booking raw token at request creation — enables WhatsApp quick-reply Accept without opening GET links. No-op when Redis is unset. */
export async function rememberBookingActionRawToken(bookingRequestId: string, rawToken: string): Promise<void> {
  const r = getRedis();
  if (!r || !bookingRequestId?.trim() || !rawToken?.trim()) return;
  try {
    await r.set(CacheKeys.bookingActionRawToken(bookingRequestId.trim()), rawToken.trim(), {
      ex: BOOKING_ACTION_RAW_TOKEN_TTL_SEC,
    });
  } catch {
    /* ignore */
  }
}

/** Read without deleting — caller signs catalog URLs before clearing via {@link forgetBookingActionRawToken}. */
export async function peekBookingActionRawToken(bookingRequestId: string): Promise<string | null> {
  const r = getRedis();
  if (!r || !bookingRequestId?.trim()) return null;
  try {
    const v = await r.get<string>(CacheKeys.bookingActionRawToken(bookingRequestId.trim()));
    return typeof v === "string" && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export async function forgetBookingActionRawToken(bookingRequestId: string): Promise<void> {
  if (!bookingRequestId?.trim()) return;
  await delKeys([CacheKeys.bookingActionRawToken(bookingRequestId.trim())]);
}

export async function delKeys(keys: string[]): Promise<void> {
  const r = getRedis();
  if (!r || keys.length === 0) return;
  try {
    await r.del(...keys);
  } catch {
    /* ignore */
  }
}

/** When Redis is disabled, returns `true` (do not block bookings). */
export async function tryAcquireSlotBookingLock(lockKey: string, ttlSeconds = 55): Promise<boolean> {
  const r = getRedis();
  if (!r) return true;
  try {
    const res = await r.set(lockKey, "1", { nx: true, ex: ttlSeconds });
    // NX success: `"OK"` (REST) / truthy; key already held: `null`
    return res != null;
  } catch {
    return true;
  }
}

export function releaseSlotBookingLock(lockKey: string): void {
  void delKeys([lockKey]);
}

export function invalidateStudentDashboard(userId: string): void {
  void delKeys([CacheKeys.studentDashboard(userId)]);
}

export function invalidatePublicMentorsList(): void {
  void delKeys([CacheKeys.publicMentorsList()]);
  /** Defer — `revalidateTag` can stall the profiler PATCH response on busy hosts; Redis key is already cleared above. */
  queueMicrotask(() => {
    try {
      revalidateTag(PUBLIC_MENTORS_REVALIDATE_TAG, "max");
    } catch {
      /* e.g. called outside a Next server context */
    }
  });
}

/** Drop the single-mentor profile cache (call after the mentor edits profile/avatar/banner). */
export function invalidatePublicMentorProfile(mentorUserId: string): void {
  void delKeys([CacheKeys.publicMentorProfile(mentorUserId)]);
}

/** Drop cached public booking totals (call after a session saves, cancels, or completes). */
export function invalidatePublicMentorBookingStats(mentorUserId: string): void {
  void delKeys([CacheKeys.publicMentorBookingStats(mentorUserId)]);
}

export async function invalidateChatThreadsForParticipants(
  studentId: string,
  mentorId: string,
): Promise<void> {
  await delKeys([
    CacheKeys.chatThreads(studentId),
    CacheKeys.chatThreads(mentorId),
    /** Keep the navbar bell in sync — notifications summary is keyed per user. */
    CacheKeys.notificationsSummary(studentId),
    CacheKeys.notificationsSummary(mentorId),
  ]);
}

/** Expose notification-summary cache invalidation for booking/session flows. */
export function invalidateNotificationsSummary(...userIds: string[]): void {
  const keys = userIds.filter(Boolean).map((id) => CacheKeys.notificationsSummary(id));
  if (keys.length > 0) void delKeys(keys);
}

export function invalidateSessionWithMentor(studentId: string, mentorUserId: string): void {
  void delKeys([CacheKeys.sessionWithMentor(studentId, mentorUserId)]);
}

/** After a booking is saved — dashboard + upcoming-session payload for that pair. */
export function invalidateAfterBooking(studentId: string, mentorUserId: string): void {
  invalidateStudentDashboard(studentId);
  invalidateSessionWithMentor(studentId, mentorUserId);
  /** Public profile totals ("minutes" + "sessions completed") change when the new session later ends. */
  invalidatePublicMentorBookingStats(mentorUserId);
  /** Navbar bell shows the "Session scheduled" card — bust the notifications summary too. */
  invalidateNotificationsSummary(studentId, mentorUserId);
}

/** Slot cache keys for a mentor around `when` (±1 local calendar day). */
export function slotCacheKeysAround(mentorUserId: string, when: Date): string[] {
  const keys: string[] = [];
  for (let d = -1; d <= 1; d++) {
    const dt = new Date(when.getTime());
    dt.setDate(dt.getDate() + d);
    keys.push(CacheKeys.mentorSlots(mentorUserId, dt.getFullYear(), dt.getMonth(), dt.getDate()));
  }
  return keys;
}

/** Booking changes slot grids — bust month cache for that month ±1. */
export function mentorMonthAvailabilityKeysAround(mentorUserId: string, when: Date): string[] {
  const keys: string[] = [];
  for (let dm = -1; dm <= 1; dm++) {
    const d = new Date(when.getTime());
    d.setMonth(d.getMonth() + dm);
    keys.push(CacheKeys.mentorMonthAvailability(mentorUserId, d.getFullYear(), d.getMonth()));
  }
  return keys;
}

/** Saved availability changed — clear cached month grids (typical booking horizon). */
export function mentorMonthAvailabilityKeysForMentor(mentorUserId: string): string[] {
  const keys: string[] = [];
  const y0 = new Date().getFullYear();
  for (const year of [y0 - 1, y0, y0 + 1]) {
    for (let month = 0; month < 12; month++) {
      keys.push(CacheKeys.mentorMonthAvailability(mentorUserId, year, month));
    }
  }
  return keys;
}

/** All per-day slot cache keys for one civil month (0-based `month`). */
export function mentorSlotKeysForCalendarMonth(mentorUserId: string, year: number, month: number): string[] {
  const dim = new Date(year, month + 1, 0).getDate();
  const keys: string[] = [];
  for (let day = 1; day <= dim; day++) {
    keys.push(CacheKeys.mentorSlots(mentorUserId, year, month, day));
  }
  return keys;
}

/** When mentor availability JSON changes, bust month grids + slot rows for this month ±1 (covers calendar navigation). */
export function mentorScheduleCacheKeysAfterAvailabilitySave(mentorUserId: string, now: Date = new Date()): string[] {
  const keys = [...mentorMonthAvailabilityKeysForMentor(mentorUserId), ...slotCacheKeysAround(mentorUserId, now)];
  for (let dm = -1; dm <= 1; dm++) {
    const d = new Date(now.getTime());
    d.setMonth(d.getMonth() + dm);
    keys.push(...mentorSlotKeysForCalendarMonth(mentorUserId, d.getFullYear(), d.getMonth()));
  }
  return keys;
}
