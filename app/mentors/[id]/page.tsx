import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { PublicMentorProfile } from "@/components/mentors/PublicMentorProfile";
import { getPublicMentorById, getSimilarMentorsForProfile } from "@/lib/mentor-directory";
import { getPublicReviewsForMentor } from "@/lib/mentor-reviews";
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

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const mentor = await getPublicMentorById(id);
  if (!mentor) return { title: "Mentor" };
  return { title: { absolute: mentor.name } };
}

export default async function PublicMentorPage({ params }: Props) {
  const { id } = await params;
  const mentor = await getPublicMentorById(id);
  if (!mentor) notFound();

  const session = await auth();

  const viewerDb =
    session?.user?.id != null
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { role: true },
        })
      : null;
  const viewerRole = viewerDb?.role ?? session?.user?.role ?? null;

  const similarMentors = await getSimilarMentorsForProfile(
    mentor.id,
    mentor,
    viewerRole === "student" ? session!.user!.id : undefined,
    8,
  );
  const mentorReviews = await getPublicReviewsForMentor(mentor.id);
  const back = `/mentors/${mentor.id}`;
  const linked = mentor.linkedUserId?.trim();
  const scheduleTarget = linked
    ? `/schedule?mentorUserId=${encodeURIComponent(linked)}`
    : "/schedule";
  const scheduleHref = session?.user?.id
    ? scheduleTarget
    : `/auth/login?callbackUrl=${encodeURIComponent(scheduleTarget)}`;

  let messageHref: string;
  if (viewerRole === "student" && linked) {
    messageHref = `/messages?peer=${encodeURIComponent(linked)}`;
  } else if (!session?.user?.id && linked) {
    messageHref = `/auth/login?callbackUrl=${encodeURIComponent(`/messages?peer=${encodeURIComponent(linked)}`)}`;
  } else if (session?.user?.id && linked && viewerRole === "mentor") {
    messageHref = `/messages`;
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
        mentorReviews={mentorReviews}
        similarMentors={similarMentors}
        similarMentorsPersonalized={viewerRole === "student"}
        messageHref={messageHref}
        scheduleHref={scheduleHref}
        viewerPortfolio={viewerPortfolio}
      />
    </MarketingShell>
  );
}
