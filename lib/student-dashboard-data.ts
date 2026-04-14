import { resolveAndPersistMeetLinkForBooking } from "@/lib/booking-resolve-google-meet";
import { CHAT_ACTIVE, CHAT_PENDING } from "@/lib/chat-thread-status";
import {
  countPastBookings,
  findUpcomingBookingsWithMentors,
  type MentoringBookingWithMentor,
} from "@/lib/mentoring-booking-access";
import { prisma } from "@/lib/prisma";
import { computeStudentProfileCompletionPercent } from "@/lib/student-profile-completion";

async function hydrateMeetLinksOnBookings(bookings: MentoringBookingWithMentor[]): Promise<void> {
  /** One-at-a-time keeps Prisma/Google work from exhausting the connection pool. */
  for (const b of bookings) {
    if (b.googleMeetLink?.trim() || !b.googleEventId?.trim()) continue;
    const link = await resolveAndPersistMeetLinkForBooking(b.id);
    if (link) b.googleMeetLink = link;
  }
}

export type StudentDashboardPayload = {
  activeMentorships: number;
  pendingMentorshipRequests: number;
  upcomingSessionsCount: number;
  nextSessionSummary: string;
  /** Conversation threads with mentors */
  messageThreadsTotal: number;
  unreadThreads: number;
  profileCompletionPercent: number;
  sessionsCompleted: number;
  mentorsWithUpcomingSessions: {
    id: string;
    name: string | null;
    image: string | null;
    mentorTitle: string | null;
    mentorCompany: string | null;
    nextSessionStart: string;
    googleMeetLink: string | null;
  }[];
  upcomingSessions: {
    id: string;
    mentorId: string;
    mentorName: string;
    startAt: string;
    endAt: string;
    googleMeetLink: string | null;
  }[];
};

export async function getStudentDashboardPayload(userId: string): Promise<StudentDashboardPayload | null> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      profileComplete: true,
      university: true,
      yearOfStudy: true,
      major: true,
      phone: true,
      interests: true,
      otherInterests: true,
      softwareSkills: true,
      bio: true,
      linkedinUrl: true,
    },
  });

  if (!me || me.role !== "student") return null;

  const now = new Date();

  const [
    activeMentorships,
    pendingMentorshipRequests,
    messageThreadsTotal,
    upcomingBookings,
    pastBookingsCount,
    threadsWithLastMessage,
  ] = await Promise.all([
    prisma.chatThread.count({
      where: { studentId: userId, status: CHAT_ACTIVE },
    }),
    prisma.chatThread.count({
      where: { studentId: userId, status: CHAT_PENDING },
    }),
    prisma.chatThread.count({
      where: { studentId: userId },
    }),
    findUpcomingBookingsWithMentors(prisma, userId, now),
    countPastBookings(prisma, userId, now),
    prisma.chatThread.findMany({
      where: { studentId: userId },
      select: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { senderId: true },
        },
      },
    }),
  ]);

  const unreadThreads = threadsWithLastMessage.filter(
    (t) => t.messages[0] && t.messages[0].senderId !== userId,
  ).length;

  await hydrateMeetLinksOnBookings(upcomingBookings);

  const seenMentor = new Set<string>();
  const mentorsWithUpcomingSessions: StudentDashboardPayload["mentorsWithUpcomingSessions"] = [];

  for (const b of upcomingBookings) {
    if (seenMentor.has(b.mentorId)) continue;
    seenMentor.add(b.mentorId);
    mentorsWithUpcomingSessions.push({
      id: b.mentor.id,
      name: b.mentor.name,
      image: b.mentor.image,
      mentorTitle: b.mentor.mentorTitle,
      mentorCompany: b.mentor.mentorCompany,
      nextSessionStart: b.startAt.toISOString(),
      googleMeetLink: b.googleMeetLink ?? null,
    });
  }

  const upcomingSessions = upcomingBookings.slice(0, 8).map((b) => ({
    id: b.id,
    mentorId: b.mentorId,
    mentorName: b.mentor.name?.trim() || "Mentor",
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    googleMeetLink: b.googleMeetLink ?? null,
  }));

  const nextStart = upcomingBookings[0]?.startAt ?? null;
  const fmt = (d: Date) =>
    d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const profileCompletionPercent = computeStudentProfileCompletionPercent(me);

  return {
    activeMentorships,
    pendingMentorshipRequests,
    upcomingSessionsCount: upcomingBookings.length,
    nextSessionSummary: nextStart ? `Next: ${fmt(nextStart)}` : "No sessions scheduled",
    messageThreadsTotal,
    unreadThreads,
    profileCompletionPercent,
    sessionsCompleted: pastBookingsCount,
    mentorsWithUpcomingSessions,
    upcomingSessions,
  };
}
