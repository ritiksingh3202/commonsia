import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getGoogleCalendarRefreshTokenForUser } from "@/lib/google-calendar-oauth-client";
import { prisma } from "@/lib/prisma";

const EditProfileForm = dynamic(
  () => import("@/components/student/edit-profile/EditProfileForm").then((m) => m.EditProfileForm),
  {
    loading: () => (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-10 w-56 max-w-full animate-pulse rounded-lg bg-neutral-200" />
        <div className="mt-6 h-[32rem] max-w-full animate-pulse rounded-2xl bg-neutral-100" />
      </div>
    ),
  },
);

export const metadata: Metadata = {
  title: { absolute: "Edit profile" },
  description: "Update your Commonsia student profile.",
};

export default async function StudentEditProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/student/profile/edit");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
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
      portfolioUrl: true,
      portfolioFileName: true,
      portfolioVisibleToOthers: true,
      whatsappUrl: true,
      linkedinUrl: true,
      instagramUrl: true,
    },
  });

  if (!user) {
    redirect("/auth/login?callbackUrl=/student/profile/edit");
  }

  const googleCalendarConnected = !!(await getGoogleCalendarRefreshTokenForUser(session.user.id));

  return <EditProfileForm user={user} googleCalendarConnected={googleCalendarConnected} />;
}
