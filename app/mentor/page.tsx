import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@/auth";
import { MentorDashboard } from "@/components/mentor/MentorDashboard";
import { ProfileCompletionWelcome } from "@/components/onboarding/ProfileCompletionWelcome";
import { getMentorOnboardingRedirectPath } from "@/lib/mentor-onboarding";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: { absolute: "Mentor home" },
  description: "Your Commonsia mentor dashboard.",
};

export default async function MentorHomePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/mentor");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      role: true,
      image: true,
      bannerImageUrl: true,
      whatsappUrl: true,
      linkedinUrl: true,
      instagramUrl: true,
      mentorTitle: true,
      mentorCompany: true,
      mentorYearsExperience: true,
      mentorCertifications: true,
      mentorMentorshipFocus: true,
      bio: true,
      mentorExpertise: true,
      mentorAvailabilityJson: true,
      mentorOnboardingComplete: true,
    },
  });

  if (!user) {
    redirect("/auth/login?callbackUrl=/mentor");
  }

  if (user.role === "student") {
    redirect("/student");
  }

  const next = getMentorOnboardingRedirectPath(user);
  if (next) {
    redirect(next);
  }

  // dashboardLive is omitted from SSR — the client component fetches it on mount via
  // /api/mentor/dashboard-live (cached 30 s in Redis). This keeps the SSR response fast
  // (~100 ms for a single user row) rather than blocking for 12 parallel DB queries.

  return (
    <>
      <MentorDashboard user={{ ...user }} />
      <Suspense fallback={null}>
        <ProfileCompletionWelcome variant="mentor" />
      </Suspense>
    </>
  );
}
