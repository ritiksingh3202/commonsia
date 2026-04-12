import type { Metadata } from "next";

import { MentorChatPage } from "@/components/chat/MentorChatPage";
import { formatNextAvailableSlotLine } from "@/lib/mentor-next-slot";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: { absolute: "Messages" },
  description: "Chat with your mentor on Commonsia.",
};

type Search = {
  name?: string;
  role?: string;
  initials?: string;
  cred?: string;
  back?: string;
  mentorUserId?: string;
};

export default async function ChatPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const mentorName = sp.name?.trim() || "Dr. Anjana Mehta";
  const mentorRole = sp.role?.trim() || "Senior Architect";
  const mentorInitials = (sp.initials?.trim() || "AM").slice(0, 4).toUpperCase();
  const mentorCredentials = sp.cred?.trim() || "Senior Architect, AIA | LEED AP";
  const rawBack = sp.back?.trim();
  const backHref =
    rawBack && rawBack.startsWith("/") && !rawBack.startsWith("//") ? rawBack : "/mentors";

  const rawMentorId = sp.mentorUserId?.trim();
  let availabilitySummary: string | null = null;
  let mentorUserId: string | null = null;
  if (rawMentorId) {
    const u = await prisma.user.findUnique({
      where: { id: rawMentorId },
      select: { role: true, mentorAvailabilityJson: true },
    });
    if (u?.role === "mentor") {
      mentorUserId = rawMentorId;
      availabilitySummary = formatNextAvailableSlotLine(u.mentorAvailabilityJson ?? null);
    }
  }

  return (
    <MentorChatPage
      mentorName={mentorName}
      mentorRole={mentorRole}
      mentorInitials={mentorInitials}
      mentorCredentials={mentorCredentials}
      backHref={backHref}
      availabilitySummary={availabilitySummary}
      mentorUserId={mentorUserId}
    />
  );
}
