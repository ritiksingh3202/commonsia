import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SessionReviewPage } from "@/components/student/SessionReviewPage";

export const metadata: Metadata = {
  title: { absolute: "Session review" },
  description: "Rate your mentoring session on Commonsia.",
};

type Search = {
  mentor?: string;
  subtitle?: string;
  initials?: string;
  type?: string;
  duration?: string;
  date?: string;
  book?: string;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function StudentSessionReviewPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/student/session/review");
  }

  const sp = await searchParams;
  const mentorName = sp.mentor?.trim() || "Dr. Sarah Johnson";
  const mentorSubtitle = sp.subtitle?.trim() || "Senior Architect, AIA";
  const mentorInitials = sp.initials?.trim() || initialsFromName(mentorName);
  const sessionType = sp.type?.trim() || "Portfolio Review";
  const durationMinutes = Math.max(15, Math.min(180, Number(sp.duration) || 45));
  const dateDisplay = sp.date?.trim() || "Mar 22, 2026";
  const rawBook = sp.book?.trim();
  const bookNextHref =
    rawBook && rawBook.startsWith("/") && !rawBook.startsWith("//") ? rawBook : "/mentors";

  return (
    <SessionReviewPage
      mentorName={mentorName}
      mentorSubtitle={mentorSubtitle}
      mentorInitials={mentorInitials}
      sessionType={sessionType}
      durationMinutes={durationMinutes}
      dateDisplay={dateDisplay}
      bookNextHref={bookNextHref}
    />
  );
}
