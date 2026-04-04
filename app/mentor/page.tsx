import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { MentorDashboard } from "@/components/mentor/MentorDashboard";
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

  if (user.role !== "mentor") {
    redirect("/student");
  }

  const next = getMentorOnboardingRedirectPath(user);
  if (next) {
    redirect(next);
  }

  return <MentorDashboard user={user} />;
}
