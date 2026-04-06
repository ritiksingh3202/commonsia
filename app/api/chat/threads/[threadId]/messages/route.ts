import { auth } from "@/auth";
import { CHAT_DECLINED, CHAT_PENDING } from "@/lib/chat-thread-status";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteCtx = { params: Promise<{ threadId: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await ctx.params;
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: { id: true, studentId: true, mentorId: true, status: true },
  });
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  if (thread.studentId !== session.user.id && thread.mentorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      createdAt: true,
      senderId: true,
    },
  });

  return NextResponse.json({
    status: thread.status,
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      senderId: m.senderId,
      isMine: m.senderId === session.user.id,
    })),
  });
}

export async function POST(req: Request, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await ctx.params;

  let body: { body?: string };
  try {
    body = (await req.json()) as { body?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Message body required" }, { status: 400 });
  }
  if (text.length > 8000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: { id: true, studentId: true, mentorId: true, status: true },
  });
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  if (thread.studentId !== session.user.id && thread.mentorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (thread.status === CHAT_DECLINED) {
    return NextResponse.json({ error: "This conversation was declined" }, { status: 403 });
  }

  const isMentor = session.user.id === thread.mentorId;
  const isStudent = session.user.id === thread.studentId;

  if (thread.status === CHAT_PENDING && isMentor) {
    return NextResponse.json(
      { error: "Accept the message request before replying" },
      { status: 403 },
    );
  }

  if (!isMentor && !isStudent) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const msg = await prisma.chatMessage.create({
    data: {
      threadId,
      senderId: session.user.id,
      body: text,
    },
    select: { id: true, body: true, createdAt: true, senderId: true },
  });

  await prisma.chatThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({
    message: {
      id: msg.id,
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
      senderId: msg.senderId,
      isMine: true,
    },
  });
}
