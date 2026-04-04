import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@/auth";
import { MentorAvailabilityForm } from "@/components/mentor/MentorAvailabilityForm";
import { getGoogleCalendarRefreshToken } from "@/lib/google-calendar-db";
import { getMentorOnboardingRedirectPath } from "@/lib/mentor-onboarding";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: { absolute: "Set availability" },
  description: "Configure when students can book sessions with you.",
};

export default async function MentorAvailabilityPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/register/mentor?callbackUrl=/mentor/availability");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      mentorTitle: true,
      mentorMentorshipFocus: true,
      bio: true,
      mentorOnboardingComplete: true,
      mentorAvailabilityJson: true,
    },
  });

  if (!user) {
    redirect("/auth/login?callbackUrl=/mentor/availability");
  }
  if (user.role !== "mentor") {
    redirect("/student");
  }

  const next = getMentorOnboardingRedirectPath(user);
  if (next && next !== "/mentor/availability") {
    redirect(next);
  }

  const googleCalendarConnected = !!(await getGoogleCalendarRefreshToken(session.user.id));

  return (
    <Suspense fallback={<div className="p-10 text-center text-[13px] text-[#6b7280]">Loading…</div>}>
      <MentorAvailabilityForm
        initialJson={user.mentorAvailabilityJson ?? null}
        googleCalendarConnected={googleCalendarConnected}
      />
    </Suspense>
  );
}
