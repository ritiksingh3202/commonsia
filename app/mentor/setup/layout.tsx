import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * If onboarding is finished, skip setup screens (users will use edit profile later).
 * Unauthenticated visitors are sent to login with `callbackUrl=/mentor` so post-OAuth `/auth/continue` can resume.
 */
export default async function MentorSetupLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent("/mentor")}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, mentorOnboardingComplete: true },
  });

  if (!user) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent("/mentor")}`);
  }
  if (user.role === "student") {
    redirect("/student");
  }

  if (user.mentorOnboardingComplete) {
    redirect("/mentor");
  }

  return <>{children}</>;
}
