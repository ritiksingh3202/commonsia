import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { PublicMentorProfile } from "@/components/mentors/PublicMentorProfile";
import { getMentorById } from "@/lib/mentors-data";
import { prisma } from "@/lib/prisma";

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const mentor = getMentorById(id);
  if (!mentor) return { title: "Mentor" };
  return { title: { absolute: mentor.name } };
}

export default async function PublicMentorPage({ params }: Props) {
  const { id } = await params;
  const mentor = getMentorById(id);
  if (!mentor) notFound();

  const session = await auth();
  const back = `/mentors/${mentor.id}`;
  const linked = mentor.linkedUserId?.trim();

  let messageHref: string;
  if (session?.user?.role === "student" && linked) {
    messageHref = `/messages?peer=${encodeURIComponent(linked)}`;
  } else if (!session?.user?.id && linked) {
    messageHref = `/auth/login?callbackUrl=${encodeURIComponent(`/messages?peer=${linked}`)}`;
  } else {
    messageHref = `/chat?${new URLSearchParams({
      name: mentor.name,
      role: mentor.role,
      initials: initialsFromName(mentor.name),
      cred: mentor.role,
      back,
    }).toString()}`;
  }

  let viewerPortfolio: {
    userId: string;
    portfolioUrl: string | null;
    portfolioFileName: string | null;
    portfolioVisibleToOthers: boolean;
  } | null = null;

  if (linked) {
    const u = await prisma.user.findFirst({
      where: { id: linked, role: "mentor" },
      select: {
        id: true,
        portfolioUrl: true,
        portfolioFileName: true,
        portfolioVisibleToOthers: true,
      },
    });
    if (u) {
      viewerPortfolio = {
        userId: u.id,
        portfolioUrl: u.portfolioUrl,
        portfolioFileName: u.portfolioFileName,
        portfolioVisibleToOthers: u.portfolioVisibleToOthers,
      };
    }
  }

  return (
    <MarketingShell>
      <PublicMentorProfile
        mentor={mentor}
        messageHref={messageHref}
        scheduleHref="/schedule"
        viewerPortfolio={viewerPortfolio}
      />
    </MarketingShell>
  );
}
