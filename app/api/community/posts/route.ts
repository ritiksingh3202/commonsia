import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { classifyForumPostText } from "@/lib/forum-categories";
import { prisma } from "@/lib/prisma";

const MAX_BODY = 2000;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to start a thread." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const text = typeof b.text === "string" ? b.text.trim() : "";
  const categoryRaw = typeof b.category === "string" ? b.category.trim() : null;

  if (!text) {
    return NextResponse.json({ error: "Post text is required." }, { status: 400 });
  }
  if (text.length > MAX_BODY) {
    return NextResponse.json({ error: `Post must be ${MAX_BODY} characters or fewer.` }, { status: 400 });
  }

  const category = categoryRaw ?? classifyForumPostText(text)?.category ?? null;

  const post = await prisma.forumPost.create({
    data: {
      authorUserId: session.user.id,
      text,
      category,
      links: [],
    },
    select: { id: true },
  });

  return NextResponse.json({ id: post.id });
}
