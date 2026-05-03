import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicMentorProfile } from "@/components/mentors/PublicMentorProfile";
import { getPublicMentorById, getPublicMentors, getSimilarMentorsForProfile } from "@/lib/mentor-directory";
import { getMentorBookingStats } from "@/lib/mentor-dashboard-stats";
import { mentorProfileHref, mentorProfileSlug } from "@/lib/mentor-slug";
import { getPublicReviewsForMentor } from "@/lib/mentor-reviews";

type Props = { params: Promise<{ id: string }> };

/**
 * Mentor profiles are public — no auth needed server-side. Auth-dependent UI (booking button
 * state, message href) is computed client-side via useSession() in PublicMentorProfile.
 * This lets Next.js fully ISR-cache the page at the CDN edge: first paint is ~50ms instead
 * of a cold server render every time.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const mentors = await getPublicMentors();
    return mentors.map((m) => ({ id: mentorProfileSlug(m) }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const mentor = await getPublicMentorById(id);
  if (!mentor) return { title: "Mentor" };
  return { title: { absolute: mentor.name } };
}

export default async function PublicMentorPage({ params }: Props) {
  const { id: param } = await params;

  const mentor = await getPublicMentorById(param);
  if (!mentor) notFound();

  const linked = mentor.linkedUserId?.trim() || null;

  const [similarMentors, mentorReviews, bookingStats] = await Promise.all([
    getSimilarMentorsForProfile(mentor.id, mentor, undefined, 8),
    getPublicReviewsForMentor(mentor.id),
    getMentorBookingStats(mentor.id),
  ]);

  const profilePath = mentorProfileHref(mentor);

  const viewerPortfolio =
    linked && mentor.portfolioVisibleToOthers !== undefined
      ? {
          userId: linked,
          portfolioUrl: mentor.portfolioUrl ?? null,
          portfolioFileName: mentor.portfolioFileName ?? null,
          portfolioVisibleToOthers: Boolean(mentor.portfolioVisibleToOthers),
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
      mentorLinkedUserId={linked}
      profilePath={profilePath}
      viewerPortfolio={viewerPortfolio}
    />
  );
}
