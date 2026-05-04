import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getForumReplies } from "@/lib/forum-feed";
import { prisma } from "@/lib/prisma";

type RouteCtx = { params: Promise<{ id: string }> };

const MAX_REPLY = 1000;

export async function GET(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const replies = await getForumReplies(id);
  return NextResponse.json({ replies });
}

export async function POST(req: Request, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to reply." }, { status: 401 });
  }

  const { id: postId } = await ctx.params;

  const post = await prisma.forumPost.findUnique({
    where: { id: postId, deletedAt: null },
    select: { id: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const text = typeof b.body === "string" ? b.body.trim() : "";

  if (!text) {
    return NextResponse.json({ error: "Reply cannot be empty." }, { status: 400 });
  }
  if (text.length > MAX_REPLY) {
    return NextResponse.json({ error: `Reply must be ${MAX_REPLY} characters or fewer.` }, { status: 400 });
  }

  const reply = await prisma.forumReply.create({
    data: { postId, authorId: session.user.id, body: text },
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { name: true, image: true, role: true } },
    },
  });

  return NextResponse.json({
    reply: {
      id: reply.id,
      body: reply.body,
      createdAt: reply.createdAt.toISOString(),
      author: reply.author,
    },
  });
}
