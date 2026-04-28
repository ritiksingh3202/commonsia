import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { StudentDashboard } from "@/components/student/StudentDashboard";
import { StudentDashboardDbUnavailable } from "@/components/student/StudentDashboardDbUnavailable";
import { DatabaseUnavailableError, isPrismaConnectionError } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
import { getStudentDashboardPayload } from "@/lib/student-dashboard-data";
import { studentProfileUserSelect } from "@/components/student/student-profile-types";
import { trimLargeDataUrlField } from "@/lib/mentor-directory";
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

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        ...studentProfileUserSelect,
        role: true,
        profileComplete: true,
      },
    });
  } catch (e) {
    if (isPrismaConnectionError(e)) {
      return <StudentDashboardDbUnavailable />;
    }
    throw e;
  }

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
    whatsappUrl: user.whatsappUrl,
    phone: user.phone,
    interests: user.interests,
    otherInterests: user.otherInterests,
    softwareSkills: user.softwareSkills,
  });
  if (onboarding) {
    redirect(onboarding);
  }

  let dashboardInitial;
  try {
    dashboardInitial = await getStudentDashboardPayload(session.user.id);
  } catch (e) {
    if (e instanceof DatabaseUnavailableError) {
      return <StudentDashboardDbUnavailable />;
    }
    throw e;
  }
  if (!dashboardInitial) {
    redirect("/auth");
  }

  const { profileComplete, role, ...dashboardUserRaw } = user;
  void profileComplete;
  void role;
  const dashboardUser = {
    ...dashboardUserRaw,
    image: trimLargeDataUrlField(dashboardUserRaw.image),
    bannerImageUrl: trimLargeDataUrlField(dashboardUserRaw.bannerImageUrl),
    portfolioFileDataUrl: trimLargeDataUrlField(dashboardUserRaw.portfolioFileDataUrl),
  };
  return <StudentDashboard user={dashboardUser} initialDashboard={dashboardInitial} />;
}
