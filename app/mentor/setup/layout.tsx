import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * If onboarding is finished, skip setup screens (users will use edit profile later).
 * Unauthenticated visitors are handled by each `setup/[step]/page.tsx` (correct callbackUrl per step).
 */
export default async function MentorSetupLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    return <>{children}</>;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, mentorOnboardingComplete: true },
  });

  if (!user || user.role !== "mentor") {
    redirect("/student");
  }

  if (user.mentorOnboardingComplete) {
    redirect("/mentor");
  }

  return <>{children}</>;
}
