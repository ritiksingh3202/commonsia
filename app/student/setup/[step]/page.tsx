import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { StudentSetupStep1 } from "@/components/student/StudentSetupStep1";
import { StudentSetupStep2 } from "@/components/student/StudentSetupStep2";
import { StudentSetupStep3 } from "@/components/student/StudentSetupStep3";

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
  const session = await auth();
  const { step: raw } = await params;
  const step = Number(raw);
  if (!Number.isInteger(step) || step < 1 || step > 3) notFound();

  if (!session?.user) {
    redirect(`/auth/register/student?callbackUrl=${encodeURIComponent(`/student/setup/${step}`)}`);
  }

  if (step === 1) return <StudentSetupStep1 />;
  if (step === 2) return <StudentSetupStep2 />;
  return <StudentSetupStep3 />;
}
