import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { StudentSetupStep1 } from "@/components/student/StudentSetupStep1";
import { StudentSetupStep2 } from "@/components/student/StudentSetupStep2";
import { StudentSetupStep3 } from "@/components/student/StudentSetupStep3";
import { cachedAuth, cachedStudentSetupUser } from "@/lib/request-cache";

const titles: Record<number, string> = {
  1: "Profile setup",
  2: "Interests",
  3: "Portfolio",
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

export default async function StudentSetupPage({
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
    redirect(`/auth/login?callbackUrl=${encodeURIComponent("/student")}`);
  }

  const user = await cachedStudentSetupUser(session.user.id);
  const linkedInConnected = !!user?.accounts?.some((a) => a.provider === "linkedin");

  const initial = user
    ? {
        country: user.country,
        city: user.city,
        university: user.university,
        yearOfStudy: user.yearOfStudy,
        major: user.major,
        interests: user.interests,
        softwareSkills: user.softwareSkills,
        otherInterests: user.otherInterests,
        bio: user.bio,
        portfolioUrl: user.portfolioUrl,
        portfolioFileName: user.portfolioFileName,
        phone: user.phone,
        whatsappUrl: user.whatsappUrl,
        linkedinUrl: user.linkedinUrl,
      }
    : undefined;

  if (step === 1) return <StudentSetupStep1 initial={initial} linkedInConnected={linkedInConnected} />;
  if (step === 2) return <StudentSetupStep2 initial={initial} linkedInConnected={linkedInConnected} />;
  return <StudentSetupStep3 initial={initial} linkedInConnected={linkedInConnected} />;
}
