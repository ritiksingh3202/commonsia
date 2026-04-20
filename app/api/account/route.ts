import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { CACHE_TAG_HOME_TESTIMONIALS, mentorReviewsTag } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { invalidatePublicMentorsList, invalidateStudentDashboard } from "@/lib/redis-cache";
import { prismaGeneratedClientHasAccountDeletedAt } from "@/lib/user-active";

function isUnknownAccountDeletedArgError(e: unknown): boolean {
  const m = String(e instanceof Error ? e.message : e);
  return m.includes("Unknown argument") && m.includes("accountDeletedAt");
}

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

  const finishAfterClose = async (role: string | null | undefined) => {
    invalidateStudentDashboard(userId);
    if (role === "mentor") {
      invalidatePublicMentorsList();
    }
    try {
      revalidateTag(CACHE_TAG_HOME_TESTIMONIALS, "max");
      revalidateTag(mentorReviewsTag(userId), "max");
    } catch {
      /* outside Next cache context */
    }
  };

  const existing = prismaGeneratedClientHasAccountDeletedAt()
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { accountDeletedAt: true, role: true },
      })
    : await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
  if (!existing) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if ("accountDeletedAt" in existing && existing.accountDeletedAt) {
    return NextResponse.json({ ok: true });
  }

  const role = existing.role;

  try {
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
  } catch (e) {
    if (isUnknownAccountDeletedArgError(e)) {
      /**
       * Never hard-delete here: breaks FKs and is wrong for “soft close”. Previously we fell back to
       * `user.delete` when the column was missing — that corrupts OAuth-linked history and causes
       * opaque Prisma errors in production if migrations lag.
       */
      console.error(
        "[api/account] User.accountDeletedAt is missing in the database. Run `npx prisma migrate deploy` " +
          "(or `prisma db push` on a fresh dev DB) against this project's DATABASE_URL.",
        e,
      );
      return NextResponse.json(
        {
          error:
            "Account closure is unavailable until the database schema is updated. Ask the site owner to run Prisma migrations on production.",
        },
        { status: 503 },
      );
    }
    throw e;
  }

  await finishAfterClose(role);

  return NextResponse.json({ ok: true });
}

export const runtime = "nodejs";
