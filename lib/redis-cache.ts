import { Redis } from "@upstash/redis";

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
  studentDashboard: (userId: string) => `${PREFIX}:dashboard:student:${userId}`,
  chatThreads: (userId: string) => `${PREFIX}:chat:threads:${userId}`,
  sessionWithMentor: (studentId: string, mentorUserId: string) =>
    `${PREFIX}:session:${studentId}:${mentorUserId}`,
  mentorSlots: (mentorUserId: string, year: number, month: number, day: number) =>
    `${PREFIX}:slots:${mentorUserId}:${year}-${month}-${day}`,
} as const;

export const CacheTtl = {
  studentDashboard: 30,
  chatThreads: 12,
  sessionWithMentor: 8,
  mentorSlots: 45,
} as const;

async function readJson<T>(key: string): Promise<T | undefined> {
  const r = getRedis();
  if (!r) return undefined;
  try {
    const raw = await r.get<string>(key);
    if (raw == null || raw === "") return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

async function writeJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch {
    /* ignore cache write failures */
  }
}

/**
 * Read-through cache: returns cached JSON or runs `fetcher` and stores the result.
 * Does not cache `null` / `undefined` (avoids persisting error or forbidden-shaped responses).
 */
export async function withJsonCache<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = await readJson<T>(key);
  if (hit !== undefined) return hit;
  const fresh = await fetcher();
  if (fresh != null) {
    await writeJson(key, fresh, ttlSeconds);
  }
  return fresh;
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

export function invalidateStudentDashboard(userId: string): void {
  void delKeys([CacheKeys.studentDashboard(userId)]);
}

export function invalidateChatThreadsForParticipants(studentId: string, mentorId: string): void {
  void delKeys([CacheKeys.chatThreads(studentId), CacheKeys.chatThreads(mentorId)]);
}

export function invalidateSessionWithMentor(studentId: string, mentorUserId: string): void {
  void delKeys([CacheKeys.sessionWithMentor(studentId, mentorUserId)]);
}

/** After a booking is saved — dashboard + upcoming-session payload for that pair. */
export function invalidateAfterBooking(studentId: string, mentorUserId: string): void {
  invalidateStudentDashboard(studentId);
  invalidateSessionWithMentor(studentId, mentorUserId);
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
