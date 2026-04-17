import { auth } from "@/auth";
import { CHAT_ACTIVE, CHAT_DECLINED, CHAT_PENDING } from "@/lib/chat-thread-status";
import { CacheKeys, CacheTtl, invalidateChatThreadsForParticipants, withJsonCache } from "@/lib/redis-cache";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const peerSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  mentorTitle: true,
  mentorCompany: true,
  university: true,
  yearOfStudy: true,
  major: true,
  linkedinUrl: true,
  instagramUrl: true,
  whatsappUrl: true,
  portfolioUrl: true,
} as const;

type PeerRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string | null;
  mentorTitle: string | null;
  mentorCompany: string | null;
  university: string | null;
  yearOfStudy: string | null;
  major: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  whatsappUrl: string | null;
  portfolioUrl: string | null;
};

function publicPeerPayload(peer: PeerRow) {
  const r = peer.role;
  return {
    id: peer.id,
    name: peer.name,
    email: peer.email,
    image: peer.image,
    role: r === "mentor" || r === "student" ? r : null,
    subtitle:
      r === "mentor"
        ? [peer.mentorTitle, peer.mentorCompany].filter(Boolean).join(", ") || "Mentor"
        : [peer.major, peer.yearOfStudy, peer.university].filter(Boolean).join(", ") || "Student",
    linkedinUrl: peer.linkedinUrl,
    instagramUrl: peer.instagramUrl,
    whatsappUrl: peer.whatsappUrl,
    portfolioUrl: peer.portfolioUrl,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!me?.role) {
    return NextResponse.json({ error: "Profile role missing" }, { status: 403 });
  }

  const where =
    me.role === "student"
      ? { studentId: me.id }
      : me.role === "mentor"
        ? { mentorId: me.id }
        : null;
  if (!where) {
    return NextResponse.json({ error: "Invalid role for chat" }, { status: 403 });
  }

  const cacheKey = CacheKeys.chatThreads(me.id);
  const body = await withJsonCache(cacheKey, CacheTtl.chatThreads, async () => {
    const threads = await prisma.chatThread.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        student: { select: peerSelect },
        mentor: { select: peerSelect },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, createdAt: true, senderId: true },
        },
      },
    });

    const payload = threads.map((t) => {
      const peer = me.role === "student" ? t.mentor : t.student;
      const last = t.messages[0];
      return {
        id: t.id,
        status: t.status,
        updatedAt: t.updatedAt.toISOString(),
        peer: publicPeerPayload(peer),
        lastMessagePreview: last?.body?.slice(0, 120) ?? null,
        lastMessageAt: last?.createdAt.toISOString() ?? null,
      };
    });

    return { threads: payload, role: me.role };
  });

  return NextResponse.json(body);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { peerUserId?: string };
  try {
    body = (await req.json()) as { peerUserId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const peerUserId = typeof body.peerUserId === "string" ? body.peerUserId.trim() : "";
  if (!peerUserId) {
    return NextResponse.json({ error: "peerUserId required" }, { status: 400 });
  }

  const [me, peer] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    }),
    prisma.user.findUnique({
      where: { id: peerUserId },
      select: { id: true, role: true },
    }),
  ]);

  if (!me?.role) {
    return NextResponse.json({ error: "Profile role missing" }, { status: 403 });
  }
  if (!peer?.role) {
    return NextResponse.json({ error: "Peer not found" }, { status: 404 });
  }

  let studentId: string;
  let mentorId: string;

  if (me.role === "student" && peer.role === "mentor") {
    studentId = me.id;
    mentorId = peer.id;
  } else if (me.role === "mentor" && peer.role === "student") {
    studentId = peer.id;
    mentorId = me.id;
  } else {
    return NextResponse.json({ error: "Chat is only between one student and one mentor" }, { status: 400 });
  }

  if (studentId === mentorId) {
    return NextResponse.json({ error: "Invalid peer" }, { status: 400 });
  }

  const newStatus = me.role === "mentor" ? CHAT_ACTIVE : CHAT_PENDING;

  let thread = await prisma.chatThread.upsert({
    where: {
      studentId_mentorId: { studentId, mentorId },
    },
    create: {
      studentId,
      mentorId,
      status: newStatus,
    },
    update: {},
  });

  if (thread.status === CHAT_DECLINED) {
    thread = await prisma.chatThread.update({
      where: { id: thread.id },
      data: { status: CHAT_PENDING, updatedAt: new Date() },
    });
  }

  const fresh = await prisma.chatThread.findUniqueOrThrow({
    where: { id: thread.id },
    include: {
      student: { select: peerSelect },
      mentor: { select: peerSelect },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, senderId: true },
      },
    },
  });

  const peerOut = me.role === "student" ? fresh.mentor : fresh.student;
  const last = fresh.messages[0];

  await invalidateChatThreadsForParticipants(studentId, mentorId);

  return NextResponse.json({
    thread: {
      id: fresh.id,
      status: fresh.status,
      updatedAt: fresh.updatedAt.toISOString(),
      peer: publicPeerPayload(peerOut),
      lastMessagePreview: last?.body?.slice(0, 120) ?? null,
      lastMessageAt: last?.createdAt.toISOString() ?? null,
    },
  });
}
