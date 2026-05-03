import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { MentorSetupStep1 } from "@/components/mentor/MentorSetupStep1";
import { MentorSetupStep2 } from "@/components/mentor/MentorSetupStep2";
import { MentorSetupStep3 } from "@/components/mentor/MentorSetupStep3";
import { cachedAuth, cachedMentorSetupUser } from "@/lib/request-cache";

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
  const { step: raw } = await params;
  const step = Number(raw);
  if (!Number.isInteger(step) || step < 1 || step > 3) notFound();

  // Both return cached values already fetched by the layout — zero extra round-trips.
  const session = await cachedAuth();
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent("/mentor")}`);
  }

  const user = await cachedMentorSetupUser(session.user.id);
  const linkedInConnected = !!user?.accounts?.length;

  const initial = user
    ? {
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
      }
    : undefined;

  if (step === 1) return <MentorSetupStep1 initial={initial} linkedInConnected={linkedInConnected} />;
  if (step === 2) return <MentorSetupStep2 initial={initial} linkedInConnected={linkedInConnected} />;
  return <MentorSetupStep3 initial={initial} linkedInConnected={linkedInConnected} />;
}
