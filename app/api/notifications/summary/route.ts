import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { CHAT_ACTIVE, CHAT_PENDING } from "@/lib/chat-thread-status";
import { prisma } from "@/lib/prisma";
import { isPrismaConnectionError } from "@/lib/prisma-errors";
import { CacheKeys, readJsonCache, writeJsonCacheEntry } from "@/lib/redis-cache";

export const runtime = "nodejs";

type NotificationItem = {
  id: string;
  type: "message_request" | "message_waiting" | "message_accepted" | "session_booked";
  title: string;
  subtitle: string | null;
  href: string;
  threadId?: string;
  canAccept?: boolean;
  canDecline?: boolean;
};

type SummaryPayload = { totalCount: number; items: NotificationItem[] };

/**
 * Short-lived per-user Redis cache. The navbar bell polls every 45s per tab, multiple tabs +
 * navigation remounts can fire many requests in quick succession. A 15s TTL keeps the badge
 * near-realtime while slashing DB load on hot pages (setup wizard, dashboards).
 */
const CACHE_TTL_SECONDS = 15;

async function readCachedSummary(userId: string): Promise<SummaryPayload | null> {
  const hit = await readJsonCache<SummaryPayload>(CacheKeys.notificationsSummary(userId));
  return hit ?? null;
}

function writeCachedSummary(userId: string, payload: SummaryPayload): void {
  /** Fire-and-forget — never block the HTTP response on a slow Redis write. */
  void writeJsonCacheEntry(CacheKeys.notificationsSummary(userId), payload, CACHE_TTL_SECONDS);
}

/**
 * Lightweight inbox for the navbar bell — message requests (mentors), waiting state (students),
 * and recently created upcoming sessions (both roles).
 *
 * Speed tricks:
 *  - Role comes from the JWT session (`session.user.role`) so no `SELECT role FROM "User"` round-trip.
 *  - All DB queries run in parallel (`Promise.all`), and role-mismatched ones short-circuit to `[]`.
 *  - A 15-second per-user Redis cache absorbs duplicate polls from multi-tab + route remounts.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session?.user?.role;
  if (role !== "student" && role !== "mentor") {
    return NextResponse.json<SummaryPayload>(
      { totalCount: 0, items: [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const cached = await readCachedSummary(userId);
  if (cached) {
    return NextResponse.json(cached, { headers: { "Cache-Control": "private, no-store" } });
  }

  const now = new Date();
  const sessionRecency = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const acceptNotifyCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  type MentorPendingRow = Prisma.ChatThreadGetPayload<{
    include: {
      student: { select: { name: true; email: true } };
      messages: { orderBy: { createdAt: "desc" }; take: 1; select: { body: true } };
    };
  }>;
  type StudentPendingRow = Prisma.ChatThreadGetPayload<{
    include: { mentor: { select: { name: true; email: true } } };
  }>;
  type StudentAcceptedRow = Prisma.ChatThreadGetPayload<{
    include: { mentor: { select: { name: true; email: true } } };
  }>;
  type BookingRow = Prisma.MentoringBookingGetPayload<{
    include: {
      student: { select: { name: true } };
      mentor: { select: { name: true } };
    };
  }>;

  let mentorPending: MentorPendingRow[] = [];
  let studentPending: StudentPendingRow[] = [];
  let studentAccepted: StudentAcceptedRow[] = [];
  let bookings: BookingRow[] = [];

  try {
    const results = await Promise.all([
      role === "mentor"
        ? prisma.chatThread.findMany({
            where: { mentorId: userId, status: CHAT_PENDING },
            orderBy: { updatedAt: "desc" },
            take: 12,
            include: {
              student: { select: { name: true, email: true } },
              messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { body: true },
              },
            },
          })
        : Promise.resolve<MentorPendingRow[]>([]),
      /**
       * Student pending threads: only threads where the student has already posted a message are
       * shown as "waiting". The relational `some` filter pushes that predicate into Postgres so we
       * avoid pulling an extra row per thread and filtering in JS (as the old `include.messages`
       * variant did).
       */
      role === "student"
        ? prisma.chatThread.findMany({
            where: {
              studentId: userId,
              status: CHAT_PENDING,
              messages: { some: { senderId: userId } },
            },
            orderBy: { updatedAt: "desc" },
            take: 8,
            include: { mentor: { select: { name: true, email: true } } },
          })
        : Promise.resolve<StudentPendingRow[]>([]),
      role === "student"
        ? prisma.chatThread.findMany({
            where: {
              studentId: userId,
              status: CHAT_ACTIVE,
              mentorAcceptedAt: { gte: acceptNotifyCutoff },
            },
            orderBy: { mentorAcceptedAt: "desc" },
            take: 8,
            include: { mentor: { select: { name: true, email: true } } },
          })
        : Promise.resolve<StudentAcceptedRow[]>([]),
      prisma.mentoringBooking.findMany({
        where: {
          ...(role === "mentor" ? { mentorId: userId } : { studentId: userId }),
          startAt: { gte: now, lte: horizon },
          createdAt: { gte: sessionRecency },
        },
        orderBy: { startAt: "asc" },
        take: 6,
        include: {
          student: { select: { name: true } },
          mentor: { select: { name: true } },
        },
      }),
    ]);
    mentorPending = results[0] as MentorPendingRow[];
    studentPending = results[1] as StudentPendingRow[];
    studentAccepted = results[2] as StudentAcceptedRow[];
    bookings = results[3] as BookingRow[];
  } catch (e) {
    /**
     * If Postgres is temporarily unreachable (P1001/P1002/etc), do NOT 500-loop the navbar.
     * Return an empty payload and cache it briefly to absorb repeated polls/remounts.
     */
    if (isPrismaConnectionError(e)) {
      const payload: SummaryPayload = { totalCount: 0, items: [] };
      writeCachedSummary(userId, payload);
      return NextResponse.json(payload, { headers: { "Cache-Control": "private, no-store" } });
    }
    throw e;
  }

  const items: NotificationItem[] = [];

  if (role === "mentor") {
    for (const t of mentorPending) {
      const name = t.student.name?.trim() || t.student.email || "A student";
      const preview = t.messages[0]?.body?.trim().slice(0, 100) ?? null;
      items.push({
        id: `msg-req-${t.id}`,
        type: "message_request",
        title: `Message request from ${name}`,
        subtitle: preview || "A student wants to start a conversation.",
        href: `/messages?thread=${encodeURIComponent(t.id)}`,
        threadId: t.id,
        canAccept: true,
        canDecline: true,
      });
    }
  }

  if (role === "student") {
    for (const t of studentPending) {
      const name = t.mentor.name?.trim() || t.mentor.email || "Mentor";
      items.push({
        id: `msg-wait-${t.id}`,
        type: "message_waiting",
        title: `Waiting for ${name}`,
        subtitle: "Your message was sent. The mentor can accept to chat.",
        href: `/messages?thread=${encodeURIComponent(t.id)}`,
        threadId: t.id,
      });
    }

    for (const t of studentAccepted) {
      const name = t.mentor.name?.trim() || t.mentor.email || "Your mentor";
      items.push({
        id: `msg-ok-${t.id}`,
        type: "message_accepted",
        title: `${name} accepted your chat request`,
        subtitle: "You can message each other now. Open Messages to continue.",
        href: `/messages?thread=${encodeURIComponent(t.id)}`,
        threadId: t.id,
      });
    }
  }

  for (const b of bookings) {
    const other =
      role === "student"
        ? b.mentor.name?.trim() || "Mentor"
        : b.student.name?.trim() || "Student";
    const when = b.startAt.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    items.push({
      id: `session-${b.id}`,
      type: "session_booked",
      title: "Session scheduled",
      subtitle: `With ${other} · ${when}`,
      href: role === "student" ? "/student" : "/mentor",
    });
  }

  items.sort((a, b) => {
    const pri = (t: NotificationItem["type"]) => {
      if (t === "message_request") return 0;
      if (t === "message_waiting") return 1;
      if (t === "message_accepted") return 2;
      return 3;
    };
    return pri(a.type) - pri(b.type);
  });

  const payload: SummaryPayload = { totalCount: items.length, items };
  writeCachedSummary(userId, payload);

  return NextResponse.json(payload, { headers: { "Cache-Control": "private, no-store" } });
}
