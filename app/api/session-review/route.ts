import { randomUUID } from "node:crypto";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveUserWhere } from "@/lib/user-active";
import { revalidatePath, revalidateTag } from "next/cache";

import { CACHE_TAG_HOME_TESTIMONIALS, mentorReviewsTag } from "@/lib/cache-tags";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reviewer = await prisma.user.findFirst({
    where: { id: session.user.id, ...getActiveUserWhere() },
    select: { role: true },
  });
  if (reviewer?.role !== "student") {
    return NextResponse.json({ error: "Only students can submit session reviews" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      mentorUserId?: string;
      mentorName?: string;
      sessionType?: string;
      durationMinutes?: number;
      dateDisplay?: string;
      rating?: number;
      tags?: string[];
      comment?: string | null;
    };

    if (typeof body.rating !== "number" || body.rating < 1 || body.rating > 5) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    const mentorUserId = typeof body.mentorUserId === "string" ? body.mentorUserId.trim() : "";
    if (!mentorUserId) {
      return NextResponse.json({ error: "Missing mentor" }, { status: 400 });
    }

    const mentor = await prisma.user.findFirst({
      where: { id: mentorUserId, ...getActiveUserWhere(), role: "mentor" },
      select: { id: true },
    });
    if (!mentor) {
      return NextResponse.json({ error: "Invalid mentor" }, { status: 400 });
    }

    const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : [];
    const comment = typeof body.comment === "string" ? body.comment.trim() || null : null;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "SessionReview" (id, "createdAt", "studentId", "mentorId", rating, tags, comment) VALUES ($1, NOW(), $2, $3, $4, $5::jsonb, $6)`,
      randomUUID(),
      session.user.id,
      mentorUserId,
      body.rating,
      JSON.stringify(tags),
      comment,
    );

    revalidatePath("/");
    revalidatePath(`/mentors/${mentorUserId}`);
    revalidateTag(CACHE_TAG_HOME_TESTIMONIALS, "max");
    revalidateTag(mentorReviewsTag(mentorUserId), "max");

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
