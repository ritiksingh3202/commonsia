import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { StudentDashboard } from "@/components/student/StudentDashboard";
import { prisma } from "@/lib/prisma";

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
    },
  });

  if (!user) {
    redirect("/auth/login?callbackUrl=/student");
  }

  return <StudentDashboard user={user} />;
}
