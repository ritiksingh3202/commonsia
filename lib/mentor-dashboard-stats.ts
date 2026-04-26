import { Prisma } from "@prisma/client";

import { CHAT_ACTIVE } from "@/lib/chat-thread-status";
import { withPoolFallback } from "@/lib/db-resilient";
import { prisma } from "@/lib/prisma";
import {
  CacheKeys,
  CacheTtl,
  readJsonCache,
  writeJsonCacheEntry,
} from "@/lib/redis-cache";
import { prismaGeneratedClientHasAccountDeletedAt } from "@/lib/user-active";

export type MentorBookingStats = {
  /** All completed sessions (ended in the past). */
  completedSessionCount: number;
  /** Sum of session lengths in minutes (completed only). */
  totalMentoringMinutes: number;
  /** Completed sessions whose end falls in the current calendar month. */
  sessionsThisMonth: number;
  /** Minutes from sessions ending this calendar month. */
  minutesThisMonth: number;
};

export type MentorUpcomingSession = {
  id: string;
  startAt: Date;
  endAt: Date;
  title: string | null;
  student: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

export type MentorMenteeRow = {
  threadId: string;
  studentId: string;
  name: string;
  image: string | null;
  subtitle: string;
  focus: string;
  lastSessionLabel: string;
  progressPct: number;
};

export type MentorActivityRow = {
  id: string;
  at: Date;
  title: string;
  /** tailwind tone for icon wrapper */
  tone: string;
  icon: "calendar" | "chat" | "star";
};

export type MentorDashboardLiveData = MentorBookingStats & {
  activeMenteeCount: number;
  menteesJoinedThisMonth: number;
  upcomingSessionCount: number;
  upcomingSessions: MentorUpcomingSession[];
  averageRating: number | null;
  reviewCount: number;
  /** 0–100 composite from ratings, sessions, and reviews. */
  impactScore: number;
  mentees: MentorMenteeRow[];
  activities: MentorActivityRow[];
};

export function formatRelativePast(when: Date): string {
  const sec = Math.round((Date.now() - when.getTime()) / 1000);
  if (sec < 45) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hour${Math.floor(sec / 3600) === 1 ? "" : "s"} ago`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)} day${Math.floor(sec / 86400) === 1 ? "" : "s"} ago`;
  return when.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function sessionBadge(startAt: Date): { label: string; className: string } {
  const now = new Date();
  const d = new Date(startAt);
  d.setHours(0, 0, 0, 0);
  const t = new Date(now);
  t.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (diffDays === 0) return { label: "Today", className: "bg-primary/15 text-primary" };
  if (diffDays === 1) return { label: "Tomorrow", className: "bg-orange-50 text-orange-700" };
  return {
    label: startAt.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    className: "bg-primary/10 text-primary",
  };
}

export function formatSessionBadge(startAt: Date): { label: string; className: string } {
  return sessionBadge(startAt);
}

/**
 * Compute completed-session totals for a mentor.
 *
 * Cached in Redis for ~90s per mentor: these numbers only shift after a session actually ends
 * (past `endAt`), and the public profile renders them on every `/mentors/:id` view. Without
 * caching, every anonymous visit fired a full `MentoringBooking.findMany` — the single biggest
 * DB hit on the profile page. Cache is auto-busted from bookings APIs on create/cancel.
 *
 * On cache miss we aggregate in Postgres instead of streaming every row back to Node. This
 * avoids hauling hundreds of `{startAt, endAt}` objects per prolific mentor just to sum their
 * durations — on Supabase ap-south, a mentor with ~300 completed sessions was eating ~400 ms
 * on the round-trip. The aggregate is bounded to 4 integers regardless of history size.
 */
export async function getMentorBookingStats(mentorId: string): Promise<MentorBookingStats> {
  const cacheKey = CacheKeys.publicMentorBookingStats(mentorId);
  const cached = await readJsonCache<MentorBookingStats>(cacheKey);
  if (cached) {
    return cached;
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  type AggRow = {
    completed_count: number | bigint | null;
    total_minutes: number | bigint | null;
    sessions_this_month: number | bigint | null;
    minutes_this_month: number | bigint | null;
  };

  const rows = await withPoolFallback(
    (client) =>
      client.$queryRaw<AggRow[]>(Prisma.sql`
        SELECT
          COUNT(*) AS completed_count,
          COALESCE(SUM(EXTRACT(EPOCH FROM ("endAt" - "startAt")) / 60.0), 0) AS total_minutes,
          COUNT(*) FILTER (WHERE "endAt" >= ${startOfMonth}) AS sessions_this_month,
          COALESCE(SUM(EXTRACT(EPOCH FROM ("endAt" - "startAt")) / 60.0)
                   FILTER (WHERE "endAt" >= ${startOfMonth}), 0) AS minutes_this_month
        FROM "MentoringBooking"
        WHERE "mentorId" = ${mentorId} AND "endAt" <= ${now}
      `),
    { label: "getMentorBookingStats" },
  );

  /** Postgres COUNT returns BIGINT — Prisma hands it to Node as `bigint` (or `number` on some drivers). Normalize. */
  const toInt = (v: number | bigint | null | undefined): number => {
    if (v == null) return 0;
    const n = typeof v === "bigint" ? Number(v) : v;
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  };

  const row = rows[0];
  const stats: MentorBookingStats = {
    completedSessionCount: toInt(row?.completed_count),
    totalMentoringMinutes: toInt(row?.total_minutes),
    sessionsThisMonth: toInt(row?.sessions_this_month),
    minutesThisMonth: toInt(row?.minutes_this_month),
  };

  try {
    await writeJsonCacheEntry(cacheKey, stats, CacheTtl.publicMentorBookingStats);
  } catch {
    /* best-effort cache write */
  }

  return stats;
}

export async function getMentorDashboardLiveData(mentorId: string): Promise<MentorDashboardLiveData> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const booking = await getMentorBookingStats(mentorId);

  const [
    activeMenteeCount,
    menteesJoinedThisMonth,
    reviewAgg,
    upcomingCount,
    upcomingList,
    threads,
    bookingCounts,
  ] = await Promise.all([
      prisma.chatThread.count({
        where: { mentorId, status: CHAT_ACTIVE },
      }),
      prisma.chatThread.count({
        where: {
          mentorId,
          status: CHAT_ACTIVE,
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.sessionReview.aggregate({
        where: { mentorId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      prisma.mentoringBooking.count({
        where: { mentorId, startAt: { gt: now } },
      }),
      prisma.mentoringBooking.findMany({
        where: { mentorId, startAt: { gt: now } },
        orderBy: { startAt: "asc" },
        take: 8,
        select: {
          id: true,
          startAt: true,
          endAt: true,
          title: true,
          student: {
            select: { id: true, name: true, image: true },
          },
        },
      }),
      prisma.chatThread.findMany({
        where: { mentorId, status: CHAT_ACTIVE },
        select: {
          id: true,
          studentId: true,
          student: {
            select: {
              id: true,
              name: true,
              image: true,
              university: true,
              yearOfStudy: true,
              major: true,
            },
          },
        },
      }),
      prisma.mentoringBooking.groupBy({
        by: ["studentId"],
        where: { mentorId },
        _count: { _all: true },
      }),
    ]);

  const countByStudent = new Map(bookingCounts.map((g) => [g.studentId, g._count._all]));

  const lastBookingByStudent = await prisma.mentoringBooking.findMany({
    where: { mentorId },
    orderBy: { endAt: "desc" },
    select: { studentId: true, endAt: true },
  });
  const lastEnd = new Map<string, Date>();
  for (const row of lastBookingByStudent) {
    if (!lastEnd.has(row.studentId)) lastEnd.set(row.studentId, row.endAt);
  }

  const mentees: MentorMenteeRow[] = threads.map((t) => {
    const s = t.student;
    const name = s.name?.trim() || "Student";
    const uni = [s.university, s.yearOfStudy].filter(Boolean).join(" • ") || "—";
    const focus = s.major?.trim() || "—";
    const last = lastEnd.get(s.id);
    const n = countByStudent.get(s.id) ?? 0;
    const progressPct = Math.min(100, n * 12 + 20);
    return {
      threadId: t.id,
      studentId: s.id,
      name,
      image: s.image,
      subtitle: uni,
      focus,
      lastSessionLabel: last ? formatRelativePast(last) : "No sessions yet",
      progressPct,
    };
  });

  const averageRating =
    reviewAgg._avg.rating != null ? Math.round(reviewAgg._avg.rating * 10) / 10 : null;
  const reviewCount = reviewAgg._count._all;

  const impactScore = Math.min(
    100,
    Math.round(
      (averageRating != null ? (averageRating / 5) * 42 : 0) +
        Math.min(28, booking.completedSessionCount * 2) +
        Math.min(30, reviewCount * 5),
    ),
  );

  type RawAct = { at: Date; sort: number; title: string; tone: string; icon: MentorActivityRow["icon"] };
  const raw: RawAct[] = [];

  const userDelSelect = prismaGeneratedClientHasAccountDeletedAt() ? ({ accountDeletedAt: true } as const) : {};

  const [recentBookings, recentMsgs, recentReviews] = await Promise.all([
    prisma.mentoringBooking.findMany({
      where: { mentorId, endAt: { lte: now } },
      orderBy: { endAt: "desc" },
      take: 6,
      select: {
        endAt: true,
        title: true,
        student: { select: { name: true, ...userDelSelect } },
      },
    }),
    prisma.chatMessage.findMany({
      where: { thread: { mentorId } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        createdAt: true,
        body: true,
        sender: { select: { name: true, ...userDelSelect } },
        thread: { select: { student: { select: { name: true, ...userDelSelect } } } },
      },
    }),
    prisma.sessionReview.findMany({
      where: { mentorId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        createdAt: true,
        rating: true,
        student: { select: { name: true, ...userDelSelect } },
      },
    }),
  ]);

  for (const b of recentBookings) {
    const who = "accountDeletedAt" in b.student && b.student.accountDeletedAt
      ? "Former member"
      : b.student.name?.trim() || "A student";
    raw.push({
      at: b.endAt,
      sort: b.endAt.getTime(),
      title: `Completed session with ${who}`,
      tone: "bg-sky-50 text-sky-600",
      icon: "calendar",
    });
  }
  for (const m of recentMsgs) {
    const who = "accountDeletedAt" in m.sender && m.sender.accountDeletedAt
      ? "Former member"
      : m.sender.name?.trim() || "Someone";
    const preview = m.body.trim().slice(0, 72);
    raw.push({
      at: m.createdAt,
      sort: m.createdAt.getTime(),
      title: preview ? `Message from ${who}: ${preview}${m.body.length > 72 ? "…" : ""}` : `Message from ${who}`,
      tone: "bg-emerald-50 text-emerald-600",
      icon: "chat",
    });
  }
  for (const r of recentReviews) {
    const who = "accountDeletedAt" in r.student && r.student.accountDeletedAt
      ? "Former member"
      : r.student.name?.trim() || "A student";
    raw.push({
      at: r.createdAt,
      sort: r.createdAt.getTime(),
      title: `${who} left a ${r.rating}-star review`,
      tone: "bg-amber-50 text-amber-600",
      icon: "star",
    });
  }

  raw.sort((a, b) => b.sort - a.sort);
  const activities: MentorActivityRow[] = raw.slice(0, 8).map((x, i) => ({
    id: `a-${i}-${x.sort}`,
    at: x.at,
    title: x.title,
    tone: x.tone,
    icon: x.icon,
  }));

  return {
    ...booking,
    activeMenteeCount,
    menteesJoinedThisMonth,
    upcomingSessionCount: upcomingCount,
    upcomingSessions: upcomingList,
    averageRating,
    reviewCount,
    impactScore,
    mentees,
    activities,
  };
}
