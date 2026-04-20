import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { CACHE_TAG_HOME_TESTIMONIALS, mentorReviewsTag } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { invalidatePublicMentorsList, invalidateStudentDashboard } from "@/lib/redis-cache";
import { prismaGeneratedClientHasAccountDeletedAt } from "@/lib/user-active";

/**
 * Close the signed-in account: keep the `User` row for history / FKs, clear auth fields,
 * remove Auth.js `Session` / `Account` rows, and hide the user from the site.
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { confirm?: string };
  try {
    body = (await req.json()) as { confirm?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.confirm !== "DELETE_MY_ACCOUNT") {
    return NextResponse.json({ error: "Confirmation required." }, { status: 400 });
  }

  const userId = session.user.id;

  /** Prisma client must include `accountDeletedAt` or update/where throws (common if `prisma generate` failed). */
  if (!prismaGeneratedClientHasAccountDeletedAt()) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!u) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    await prisma.user.delete({ where: { id: userId } });
    invalidateStudentDashboard(userId);
    if (u.role === "mentor") {
      invalidatePublicMentorsList();
    }
    try {
      revalidateTag(CACHE_TAG_HOME_TESTIMONIALS, "max");
      revalidateTag(mentorReviewsTag(userId), "max");
    } catch {
      /* outside Next cache context */
    }
    return NextResponse.json({ ok: true });
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountDeletedAt: true, role: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (existing.accountDeletedAt) {
    return NextResponse.json({ ok: true });
  }

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        accountDeletedAt: new Date(),
        email: null,
        passwordHash: null,
        googleCalendarRefreshToken: null,
      },
    }),
  ]);

  invalidateStudentDashboard(userId);
  if (existing.role === "mentor") {
    invalidatePublicMentorsList();
  }
  try {
    revalidateTag(CACHE_TAG_HOME_TESTIMONIALS, "max");
    revalidateTag(mentorReviewsTag(userId), "max");
  } catch {
    /* outside Next cache context */
  }

  return NextResponse.json({ ok: true });
}

export const runtime = "nodejs";
