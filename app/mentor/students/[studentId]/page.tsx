import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { StudentProfileViewForMentor } from "@/components/student/StudentProfileViewForMentor";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ studentId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studentId } = await params;
  if (studentId === "demo") return { title: { absolute: "Student profile (demo)" } };
  const u = await prisma.user.findFirst({
    where: { id: studentId, role: "student" },
    select: { name: true },
  });
  return { title: { absolute: u?.name?.trim() || "Student" } };
}

export default async function MentorViewStudentPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/mentor");
  }
  if (session.user.role !== "mentor") {
    redirect("/mentor");
  }

  const { studentId } = await params;
  if (studentId === "demo") {
    redirect("/mentor/students/demo");
  }

  const user = await prisma.user.findFirst({
    where: { id: studentId, role: "student" },
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

  if (!user) notFound();

  return (
    <StudentProfileViewForMentor
      user={user}
      messageHref={`/messages?peer=${encodeURIComponent(user.id)}`}
      backHref="/mentor"
    />
  );
}
