import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { CHAT_ACTIVE, CHAT_PENDING } from "@/lib/chat-thread-status";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Lightweight inbox for the navbar bell — message requests (mentors), waiting state (students),
 * and recently created upcoming sessions (both roles). Not Redis-cached so counts stay fresh.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!me?.role || (me.role !== "student" && me.role !== "mentor")) {
    return NextResponse.json({ totalCount: 0, items: [] });
  }

  const now = new Date();
  const sessionRecency = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const items: {
    id: string;
    type: "message_request" | "message_waiting" | "message_accepted" | "session_booked";
    title: string;
    subtitle: string | null;
    href: string;
    threadId?: string;
    canAccept?: boolean;
    canDecline?: boolean;
  }[] = [];

  const acceptNotifyCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (me.role === "mentor") {
    const pending = await prisma.chatThread.findMany({
      where: { mentorId: me.id, status: CHAT_PENDING },
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
    });

    for (const t of pending) {
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

  if (me.role === "student") {
    const pendingStudent = await prisma.chatThread.findMany({
      where: { studentId: me.id, status: CHAT_PENDING },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        mentor: { select: { name: true, email: true } },
        messages: {
          where: { senderId: me.id },
          take: 1,
          select: { id: true },
        },
      },
    });

    for (const t of pendingStudent) {
      if (t.messages.length === 0) continue;
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

    const acceptedThreads = await prisma.chatThread.findMany({
      where: {
        studentId: me.id,
        status: CHAT_ACTIVE,
        mentorAcceptedAt: { gte: acceptNotifyCutoff },
      },
      orderBy: { mentorAcceptedAt: "desc" },
      take: 8,
      include: {
        mentor: { select: { name: true, email: true } },
      },
    });

    for (const t of acceptedThreads) {
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

  const bookings = await prisma.mentoringBooking.findMany({
    where: {
      OR: [{ studentId: me.id }, { mentorId: me.id }],
      startAt: { gte: now, lte: horizon },
      createdAt: { gte: sessionRecency },
    },
    orderBy: { startAt: "asc" },
    take: 6,
    include: {
      student: { select: { name: true } },
      mentor: { select: { name: true } },
    },
  });

  for (const b of bookings) {
    const other =
      me.role === "student"
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
      href: me.role === "student" ? "/student" : "/mentor",
    });
  }

  items.sort((a, b) => {
    const pri = (t: (typeof items)[number]["type"]) => {
      if (t === "message_request") return 0;
      if (t === "message_waiting") return 1;
      if (t === "message_accepted") return 2;
      return 3;
    };
    return pri(a.type) - pri(b.type);
  });

  const totalCount = items.length;

  return NextResponse.json(
    { totalCount, items },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
