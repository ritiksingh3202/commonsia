import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getMentorOnboardingRedirectPath } from "@/lib/mentor-onboarding";
import { prisma } from "@/lib/prisma";
import { getStudentOnboardingRedirectPath } from "@/lib/student-onboarding";

function safeNextPath(raw: string | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

/**
 * After sign-in, sends users to onboarding when needed, otherwise to `next` or role home.
 */
export default async function AuthContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/auth/continue");
  }

  const { next: nextRaw } = await searchParams;
  const next = safeNextPath(nextRaw);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      profileComplete: true,
      university: true,
      yearOfStudy: true,
      major: true,
      phone: true,
      interests: true,
      otherInterests: true,
      softwareSkills: true,
      bio: true,
      mentorTitle: true,
      mentorCompany: true,
      mentorYearsExperience: true,
      mentorExpertise: true,
      mentorMentorshipFocus: true,
      linkedinUrl: true,
      whatsappUrl: true,
      mentorOnboardingComplete: true,
    },
  });

  if (!user) {
    redirect("/auth/login?callbackUrl=/auth/continue");
  }

  // OAuth users have no role until setup — send them to the app route they asked for so onboarding can run.
  if (!user.role) {
    if (next?.startsWith("/student")) {
      redirect(next);
    }
    if (next?.startsWith("/mentor")) {
      redirect(next);
    }
    redirect("/auth");
  }

  if (user.role === "mentor") {
    const onboarding = getMentorOnboardingRedirectPath({
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
    if (onboarding) redirect(onboarding);
    if (next) redirect(next);
    redirect("/mentor");
  }

  if (user.role === "student") {
    const onboarding = getStudentOnboardingRedirectPath({
      profileComplete: user.profileComplete,
      university: user.university,
      yearOfStudy: user.yearOfStudy,
      major: user.major,
      phone: user.phone,
      interests: user.interests,
      otherInterests: user.otherInterests,
      softwareSkills: user.softwareSkills,
    });
    if (onboarding) redirect(onboarding);
    if (next) redirect(next);
    redirect("/student");
  }

  if (next) redirect(next);
  redirect("/");
}
