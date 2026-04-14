import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { UpcomingSessionScreen } from "@/components/student/UpcomingSessionScreen";
import { resolveAndPersistMeetLinkForBooking } from "@/lib/booking-resolve-google-meet";
import { formatBookingRangeDisplay } from "@/lib/booking-datetime-display";
import { prisma } from "@/lib/prisma";
import type { SessionWithMentorPayload } from "@/lib/student-session-with-mentor-types";

export const metadata: Metadata = {
  title: { absolute: "Your session" },
  description: "View your upcoming Commonsia mentoring session and join the Meet link.",
};

export default async function StudentUpcomingSessionPage({
  params,
}: {
  params: Promise<{ mentorId: string }>;
}) {
  const { mentorId } = await params;
  const trimmed = mentorId?.trim();
  if (!trimmed) notFound();

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(`/student/upcoming/${trimmed}`)}`);
  }

  const student = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, name: true, image: true },
  });
  if (!student || student.role !== "student") {
    redirect("/");
  }

  const mentor = await prisma.user.findUnique({
    where: { id: trimmed },
    select: { role: true, name: true, image: true },
  });
  if (!mentor || mentor.role !== "mentor") notFound();

  let booking = await prisma.mentoringBooking.findFirst({
    where: {
      studentId: session.user.id,
      mentorId: trimmed,
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

  const initial: SessionWithMentorPayload = {
    mentor: { name: mentor.name, image: mentor.image },
    student: { name: student.name, image: student.image },
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

  return <UpcomingSessionScreen mentorId={trimmed} initial={initial} />;
}
