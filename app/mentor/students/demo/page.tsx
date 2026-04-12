import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { StudentProfileViewForMentor } from "@/components/student/StudentProfileViewForMentor";
import type { StudentProfileUser } from "@/components/student/student-profile-types";

export const metadata: Metadata = {
  title: { absolute: "Student profile (demo)" },
};

const DEMO_STUDENT: StudentProfileUser = {
  id: "demo-static",
  name: "Ankit Kumar",
  email: "ankit.example@commonsia.app",
  phone: null,
  image: null,
  university: "IIT Roorkee",
  yearOfStudy: "5th Year",
  major: "B Arch",
  interests: [
    "Urban Design",
    "Public Spaces",
    "Mobility Planning",
    "Urban Morphology",
    "Sustainable Cities",
    "Ekistics",
    "Real Estate",
    "Universal Design",
  ],
  otherInterests: null,
  softwareSkills: "Revit, Auto CAD, Sketchup, Rhino",
  bio: "Final year B.Arch student with experience in conceptual design, technical detailing, and architectural visualization. Skilled in tools like AutoCAD, Rhino, and SketchUp, with a growing interest in sustainable and user-centered design.",
  bannerImageUrl: null,
  whatsappUrl: null,
  linkedinUrl: null,
  instagramUrl: null,
  portfolioUrl: null,
  portfolioFileName: null,
  portfolioFileDataUrl: null,
  portfolioVisibleToOthers: true,
};

export default async function MentorStudentDemoPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/mentor/students/demo");
  }
  if (session.user.role !== "mentor") {
    redirect("/mentor");
  }

  return (
    <StudentProfileViewForMentor
      user={DEMO_STUDENT}
      messageHref="/messages"
      backHref="/mentor"
    />
  );
}
