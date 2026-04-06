import type { Metadata } from "next";

import { MentorChatPage } from "@/components/chat/MentorChatPage";

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

  return (
    <MentorChatPage
      mentorName={mentorName}
      mentorRole={mentorRole}
      mentorInitials={mentorInitials}
      mentorCredentials={mentorCredentials}
      backHref={backHref}
    />
  );
}
