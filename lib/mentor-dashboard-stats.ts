import { CHAT_ACTIVE } from "@/lib/chat-thread-status";
import { prisma } from "@/lib/prisma";
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

export async function getMentorBookingStats(mentorId: string): Promise<MentorBookingStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const completed = await prisma.mentoringBooking.findMany({
    where: {
      mentorId,
      endAt: { lte: now },
    },
    select: { startAt: true, endAt: true },
  });

  let totalMentoringMinutes = 0;
  let sessionsThisMonth = 0;
  let minutesThisMonth = 0;

  for (const b of completed) {
    const mins = Math.max(
      0,
      Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60_000),
    );
    totalMentoringMinutes += mins;
    if (b.endAt >= startOfMonth) {
      sessionsThisMonth += 1;
      minutesThisMonth += mins;
    }
  }

  return {
    completedSessionCount: completed.length,
    totalMentoringMinutes,
    sessionsThisMonth,
    minutesThisMonth,
  };
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
