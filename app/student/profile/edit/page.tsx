import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@/auth";
import { EditProfileForm } from "@/components/student/edit-profile/EditProfileForm";
import { prisma } from "@/lib/prisma";

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

  return (
    <Suspense fallback={<div className="p-10 text-center text-[13px] text-[#6b7280]">Loading…</div>}>
      <EditProfileForm user={user} />
    </Suspense>
  );
}
