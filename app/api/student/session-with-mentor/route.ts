import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { resolveAndPersistMeetLinkForBooking } from "@/lib/booking-resolve-google-meet";
import { formatBookingRangeDisplay } from "@/lib/booking-datetime-display";
import { CacheKeys, CacheTtl, withJsonCache } from "@/lib/redis-cache";
import { prisma } from "@/lib/prisma";
import type { SessionWithMentorPayload } from "@/lib/student-session-with-mentor-types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, name: true, image: true },
  });
  if (!me || me.role !== "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const mentorUserId = url.searchParams.get("mentorUserId")?.trim();
  if (!mentorUserId) {
    return NextResponse.json({ error: "mentorUserId is required" }, { status: 400 });
  }

  const mentor = await prisma.user.findUnique({
    where: { id: mentorUserId },
    select: { role: true, name: true, image: true },
  });
  if (!mentor || mentor.role !== "mentor") {
    return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
  }

  const cacheKey = CacheKeys.sessionWithMentor(session.user.id, mentorUserId);
  const payload = await withJsonCache(cacheKey, CacheTtl.sessionWithMentor, async (): Promise<SessionWithMentorPayload> => {
    let booking = await prisma.mentoringBooking.findFirst({
      where: {
        studentId: session.user.id,
        mentorId: mentorUserId,
        endAt: { gte: new Date() },
      },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        googleMeetLink: true,
        googleEventId: true,
      },
    });

    if (booking && !booking.googleMeetLink?.trim() && booking.googleEventId?.trim()) {
      const link = await resolveAndPersistMeetLinkForBooking(booking.id);
      if (link) {
        booking = { ...booking, googleMeetLink: link };
      }
    }

    return {
      mentor: { name: mentor.name, image: mentor.image },
      student: { name: me.name, image: me.image },
      booking: booking
        ? {
            id: booking.id,
            startAt: booking.startAt.toISOString(),
            endAt: booking.endAt.toISOString(),
            googleMeetLink: booking.googleMeetLink,
            displayRange: formatBookingRangeDisplay(
              booking.startAt.toISOString(),
              booking.endAt.toISOString(),
            ),
          }
        : null,
    };
  });

  return NextResponse.json(payload);
}
