import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { StudentDashboard } from "@/components/student/StudentDashboard";
import { getGoogleCalendarRefreshTokenForUser } from "@/lib/google-calendar-oauth-client";
import { prisma } from "@/lib/prisma";
import { getStudentDashboardPayload } from "@/lib/student-dashboard-data";
import { getStudentOnboardingRedirectPath } from "@/lib/student-onboarding";

export const metadata: Metadata = {
  title: { absolute: "Dashboard" },
  description: "Your Commonsia student dashboard.",
};

export default async function StudentHomePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/student");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      university: true,
      yearOfStudy: true,
      major: true,
      interests: true,
      otherInterests: true,
      softwareSkills: true,
      bio: true,
      bannerImageUrl: true,
      whatsappUrl: true,
      linkedinUrl: true,
      instagramUrl: true,
      portfolioUrl: true,
      portfolioFileName: true,
      portfolioFileDataUrl: true,
      portfolioVisibleToOthers: true,
      profileComplete: true,
    },
  });

  if (!user) {
    redirect("/auth/login?callbackUrl=/student");
  }

  if (user.role === "mentor") {
    redirect("/mentor");
  }
  // OAuth signups start with `role` null until setup saves — still route to onboarding, not Choose Role.
  if (user.role && user.role !== "student") {
    redirect("/auth");
  }

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
  if (onboarding) {
    redirect(onboarding);
  }

  const dashboardInitial = await getStudentDashboardPayload(session.user.id);
  if (!dashboardInitial) {
    redirect("/auth");
  }

  const { profileComplete, role, ...dashboardUser } = user;
  void profileComplete;
  void role;
  const googleCalendarConnected = !!(await getGoogleCalendarRefreshTokenForUser(session.user.id));
  return (
    <StudentDashboard
      user={dashboardUser}
      initialDashboard={dashboardInitial}
      googleCalendarConnected={googleCalendarConnected}
    />
  );
}
