import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { StudentSetupStep1 } from "@/components/student/StudentSetupStep1";
import { StudentSetupStep2 } from "@/components/student/StudentSetupStep2";
import { StudentSetupStep3 } from "@/components/student/StudentSetupStep3";
import { prisma } from "@/lib/prisma";
import { studentSetupUserSelect } from "@/lib/setup-load-user";

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

  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent("/student")}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      ...studentSetupUserSelect,
      accounts: {
        where: { provider: "linkedin" },
        select: { provider: true },
      },
    },
  });

  const linkedInConnected = !!user?.accounts?.some((a) => a.provider === "linkedin");

  const initial = user
    ? ({
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
        phone: user.phone,
        whatsappUrl: user.whatsappUrl,
        linkedinUrl: user.linkedinUrl,
      })
    : undefined;

  if (step === 1) {
    return (
      <StudentSetupStep1
        initial={initial}
        linkedInConnected={linkedInConnected}
      />
    );
  }
  if (step === 2) {
    return (
      <StudentSetupStep2
        initial={initial}
        linkedInConnected={linkedInConnected}
      />
    );
  }
  return (
    <StudentSetupStep3
      initial={initial}
      linkedInConnected={linkedInConnected}
    />
  );
}
