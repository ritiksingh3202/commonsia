import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { MentorSetupStep1 } from "@/components/mentor/MentorSetupStep1";
import { MentorSetupStep2 } from "@/components/mentor/MentorSetupStep2";
import { MentorSetupStep3 } from "@/components/mentor/MentorSetupStep3";
import { mentorSetupUserSelect } from "@/lib/setup-load-user";
import { prisma } from "@/lib/prisma";

const titles: Record<number, string> = {
  1: "Mentor profile",
  2: "Mentorship details",
  3: "Professional profile",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ step: string }>;
}): Promise<Metadata> {
  const { step: raw } = await params;
  const step = Number(raw);
  const t = titles[step] ?? "Setup";
  return { title: { absolute: t } };
}

export default async function MentorSetupPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const session = await auth();
  const { step: raw } = await params;
  const step = Number(raw);
  if (!Number.isInteger(step) || step < 1 || step > 3) notFound();

  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent("/mentor")}`);
  }

  /**
   * Collapse user + LinkedIn probe into ONE findUnique — saves a Postgres round-trip on every
   * "Save & Next" navigation during mentor signup.
   */
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      ...mentorSetupUserSelect,
      accounts: {
        where: { provider: "linkedin" },
        select: { provider: true },
        take: 1,
      },
    },
  });

  const linkedInConnected = !!user?.accounts?.length;
  const initial = user
    ? ({
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
        portfolioUrl: user.portfolioUrl,
        portfolioFileName: user.portfolioFileName,
        mentorCertifications: user.mentorCertifications,
        whatsappUrl: user.whatsappUrl,
      })
    : undefined;

  if (step === 1) {
    return (
      <MentorSetupStep1
        initial={initial}
        linkedInConnected={linkedInConnected}
      />
    );
  }
  if (step === 2) {
    return (
      <MentorSetupStep2
        initial={initial}
        linkedInConnected={linkedInConnected}
      />
    );
  }
  return (
    <MentorSetupStep3
      initial={initial}
      linkedInConnected={linkedInConnected}
    />
  );
}
