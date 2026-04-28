import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Whether the signed-in student already has a pending booking request with this mentor. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mentorUserId = new URL(req.url).searchParams.get("mentorUserId")?.trim();
  if (!mentorUserId) {
    return NextResponse.json({ error: "mentorUserId is required." }, { status: 400 });
  }

  const row = await prisma.bookingRequest.findFirst({
    where: { studentId: session.user.id, mentorId: mentorUserId, status: "pending" },
    orderBy: { createdAt: "desc" },
    select: { id: true, startAt: true },
  });

  return NextResponse.json({
    pending: Boolean(row),
    bookingRequestId: row?.id ?? null,
    startAt: row?.startAt.toISOString() ?? null,
  });
}

export const runtime = "nodejs";
