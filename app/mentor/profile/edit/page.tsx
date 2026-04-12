import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { MentorEditProfileForm } from "@/components/mentor/MentorEditProfileForm";
import { getMentorOnboardingRedirectPath } from "@/lib/mentor-onboarding";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: { absolute: "Edit profile — Mentor" },
  description: "Update your mentor profile on Commonsia.",
};

export default async function MentorProfileEditPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/mentor/profile/edit");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      mentorTitle: true,
      mentorCompany: true,
      mentorYearsExperience: true,
      mentorExpertise: true,
      mentorMentorshipFocus: true,
      mentorAvailabilityPref: true,
      mentorMaxMenteesPref: true,
      bio: true,
      linkedinUrl: true,
      portfolioUrl: true,
      portfolioFileName: true,
      portfolioVisibleToOthers: true,
      mentorCertifications: true,
      softwareSkills: true,
      mentorOnboardingComplete: true,
      whatsappUrl: true,
    },
  });

  if (!user) {
    redirect("/auth/login?callbackUrl=/mentor/profile/edit");
  }

  if (user.role !== "mentor") {
    redirect("/student");
  }

  const onboardingPath = getMentorOnboardingRedirectPath({
    mentorOnboardingComplete: user.mentorOnboardingComplete,
    mentorTitle: user.mentorTitle,
    mentorCompany: user.mentorCompany,
    mentorYearsExperience: user.mentorYearsExperience,
    mentorExpertise: user.mentorExpertise,
    mentorMentorshipFocus: user.mentorMentorshipFocus,
    bio: user.bio,
    linkedinUrl: user.linkedinUrl,
    whatsappUrl: user.whatsappUrl,
  });
  if (onboardingPath) {
    redirect(onboardingPath);
  }

  return (
    <MentorEditProfileForm
      initial={{
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        mentorTitle: user.mentorTitle,
        mentorCompany: user.mentorCompany,
        mentorYearsExperience: user.mentorYearsExperience,
        mentorExpertise: user.mentorExpertise,
        mentorMentorshipFocus: user.mentorMentorshipFocus,
        mentorAvailabilityPref: user.mentorAvailabilityPref,
        mentorMaxMenteesPref: user.mentorMaxMenteesPref,
        bio: user.bio,
        linkedinUrl: user.linkedinUrl,
        portfolioUrl: user.portfolioUrl,
        portfolioFileName: user.portfolioFileName,
        portfolioVisibleToOthers: user.portfolioVisibleToOthers,
        mentorCertifications: user.mentorCertifications,
        softwareSkills: user.softwareSkills,
      }}
    />
  );
}
