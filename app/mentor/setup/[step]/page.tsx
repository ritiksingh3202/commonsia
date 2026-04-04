import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { MentorSetupStep1 } from "@/components/mentor/MentorSetupStep1";
import { MentorSetupStep2 } from "@/components/mentor/MentorSetupStep2";
import { MentorSetupStep3 } from "@/components/mentor/MentorSetupStep3";

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

  if (!session?.user) {
    redirect(`/auth/register/mentor?callbackUrl=${encodeURIComponent(`/mentor/setup/${step}`)}`);
  }

  if (step === 1) return <MentorSetupStep1 />;
  if (step === 2) return <MentorSetupStep2 />;
  return <MentorSetupStep3 />;
}
