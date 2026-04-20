import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getMentorOnboardingRedirectPath } from "@/lib/mentor-onboarding";
import { prisma } from "@/lib/prisma";

const MentorEditProfileForm = dynamic(
  () => import("@/components/mentor/MentorEditProfileForm").then((m) => m.MentorEditProfileForm),
  {
    loading: () => (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-10 w-48 max-w-full animate-pulse rounded-lg bg-neutral-200" />
        <div className="mt-6 h-[28rem] max-w-full animate-pulse rounded-2xl bg-neutral-100" />
      </div>
    ),
  },
);

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
      country: true,
      city: true,
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
        country: user.country,
        city: user.city,
        mentorTitle: user.mentorTitle,
        mentorCompany: user.mentorCompany,
        mentorYearsExperience: user.mentorYearsExperience,
        mentorExpertise: user.mentorExpertise,
        mentorMentorshipFocus: user.mentorMentorshipFocus,
        mentorAvailabilityPref: user.mentorAvailabilityPref,
        mentorMaxMenteesPref: user.mentorMaxMenteesPref,
        bio: user.bio,
        linkedinUrl: user.linkedinUrl,
        whatsappUrl: user.whatsappUrl,
        portfolioUrl: user.portfolioUrl,
        portfolioFileName: user.portfolioFileName,
        portfolioVisibleToOthers: user.portfolioVisibleToOthers,
        mentorCertifications: user.mentorCertifications,
        softwareSkills: user.softwareSkills,
      }}
    />
  );
}
