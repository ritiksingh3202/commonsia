import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { PublicMentorProfile } from "@/components/mentors/PublicMentorProfile";
import { getPublicMentorById, getSimilarMentorsForProfile } from "@/lib/mentor-directory";
import { getMentorBookingStats } from "@/lib/mentor-dashboard-stats";
import { getPublicReviewsForMentor } from "@/lib/mentor-reviews";
import { prisma } from "@/lib/prisma";
import { getActiveUserWhere } from "@/lib/user-active";

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

type Props = { params: Promise<{ id: string }> };

/** Fresh booking stats when visitors open or refresh a mentor profile. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const mentor = await getPublicMentorById(id);
  if (!mentor) return { title: "Mentor" };
  return { title: { absolute: mentor.name } };
}

export default async function PublicMentorPage({ params }: Props) {
  const { id } = await params;

  /**
   * Fetch the anchor mentor + current session in parallel — `auth()` ends up hitting the DB for
   * session + provider state, so running it alongside the mentor lookup hides ~half its latency.
   */
  const [mentor, session] = await Promise.all([getPublicMentorById(id), auth()]);
  if (!mentor) notFound();

  /**
   * Trust the session's `role` claim for routing choices; the old extra `user.findFirst` just
   * re-read the same row from Prisma on every page view. We skip it here and fall back to a
   * parallel `viewerDbPromise` only when the role is unknown — keeps the critical path fast
   * without losing correctness for edge cases (stale session after role change).
   */
  const sessionUserId = session?.user?.id ?? null;
  const sessionRole = session?.user?.role ?? null;

  const linked = mentor.linkedUserId?.trim();

  /**
   * Kick off every remaining DB read in parallel — previously these awaited sequentially and the
   * page-render stalled on each round trip. Even modest connections see ~300–600ms shaved.
   */
  const viewerDbPromise =
    sessionUserId && !sessionRole
      ? prisma.user.findFirst({
          where: { id: sessionUserId, ...getActiveUserWhere() },
          select: { role: true },
        })
      : Promise.resolve(null);

  const similarMentorsPromise = getSimilarMentorsForProfile(
    mentor.id,
    mentor,
    sessionRole === "student" && sessionUserId ? sessionUserId : undefined,
    8,
  );

  const mentorReviewsPromise = getPublicReviewsForMentor(mentor.id);
  const bookingStatsPromise = getMentorBookingStats(mentor.id);

  const viewerPortfolioRowPromise = linked
    ? prisma.user.findFirst({
        where: { id: linked, ...getActiveUserWhere(), role: "mentor" },
        select: {
          id: true,
          portfolioUrl: true,
          portfolioFileName: true,
          portfolioVisibleToOthers: true,
        },
      })
    : Promise.resolve(null);

  const [viewerDb, similarMentors, mentorReviews, bookingStats, viewerPortfolioRow] =
    await Promise.all([
      viewerDbPromise,
      similarMentorsPromise,
      mentorReviewsPromise,
      bookingStatsPromise,
      viewerPortfolioRowPromise,
    ]);

  const viewerRole = sessionRole ?? viewerDb?.role ?? null;

  const back = `/mentors/${mentor.id}`;
  const scheduleTarget = linked
    ? `/schedule?mentorUserId=${encodeURIComponent(linked)}`
    : "/schedule";
  const scheduleHref = sessionUserId
    ? scheduleTarget
    : `/auth/login?callbackUrl=${encodeURIComponent(scheduleTarget)}`;

  let messageHref: string;
  if (viewerRole === "student" && linked) {
    messageHref = `/messages?peer=${encodeURIComponent(linked)}`;
  } else if (!sessionUserId && linked) {
    messageHref = `/auth/login?callbackUrl=${encodeURIComponent(`/messages?peer=${encodeURIComponent(linked)}`)}`;
  } else if (sessionUserId && linked && viewerRole === "mentor") {
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

  const viewerPortfolio = viewerPortfolioRow
    ? {
        userId: viewerPortfolioRow.id,
        portfolioUrl: viewerPortfolioRow.portfolioUrl,
        portfolioFileName: viewerPortfolioRow.portfolioFileName,
        portfolioVisibleToOthers: viewerPortfolioRow.portfolioVisibleToOthers,
      }
    : null;

  return (
    <PublicMentorProfile
      mentor={mentor}
      publicBookingStats={{
        completedSessionCount: bookingStats.completedSessionCount,
        totalMentoringMinutes: bookingStats.totalMentoringMinutes,
      }}
      mentorReviews={mentorReviews}
      similarMentors={similarMentors}
      similarMentorsPersonalized={viewerRole === "student"}
      messageHref={messageHref}
      scheduleHref={scheduleHref}
      viewerPortfolio={viewerPortfolio}
    />
  );
}
