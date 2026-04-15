import { auth } from "@/auth";
import { CHAT_ACTIVE, CHAT_DECLINED, CHAT_PENDING } from "@/lib/chat-thread-status";
import { invalidateChatThreadsForParticipants } from "@/lib/redis-cache";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteCtx = { params: Promise<{ threadId: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await ctx.params;
  if (!threadId) {
    return NextResponse.json({ error: "Missing thread" }, { status: 400 });
  }

  let body: { action?: string };
  try {
    body = (await req.json()) as { action?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action === "accept" || body.action === "decline" ? body.action : null;
  if (!action) {
    return NextResponse.json({ error: "action must be accept or decline" }, { status: 400 });
  }

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: { id: true, studentId: true, mentorId: true, status: true },
  });
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  if (thread.mentorId !== session.user.id) {
    return NextResponse.json({ error: "Only the mentor can accept or decline" }, { status: 403 });
  }
  if (thread.status !== CHAT_PENDING) {
    return NextResponse.json({ error: "Thread is not pending" }, { status: 400 });
  }

  const nextStatus = action === "accept" ? CHAT_ACTIVE : CHAT_DECLINED;
  await prisma.chatThread.update({
    where: { id: threadId },
    data: {
      status: nextStatus,
      updatedAt: new Date(),
      mentorAcceptedAt: action === "accept" ? new Date() : null,
    },
  });

  invalidateChatThreadsForParticipants(thread.studentId, thread.mentorId);

  return NextResponse.json({ ok: true, status: nextStatus });
}
