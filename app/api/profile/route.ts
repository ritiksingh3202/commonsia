import { auth } from "@/auth";
import { getActiveUserWhere } from "@/lib/user-active";
import {
  delKeys,
  invalidatePublicMentorProfile,
  invalidatePublicMentorsList,
  invalidateStudentDashboard,
  mentorMonthAvailabilityKeysForMentor,
} from "@/lib/redis-cache";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export type ProfilePayload = {
  name?: string | null;
  phone?: string | null;
  /** Profile photo — data URL or HTTPS (Auth.js `image` field) */
  image?: string | null;
  role?: "student" | "mentor";
  university?: string | null;
  yearOfStudy?: string | null;
  major?: string | null;
  country?: string | null;
  city?: string | null;
  interests?: string[] | null;
  softwareSkills?: string | null;
  otherInterests?: string | null;
  bio?: string | null;
  portfolioUrl?: string | null;
  portfolioVisibleToOthers?: boolean;
  profileComplete?: boolean;
  bannerImageUrl?: string | null;
  whatsappUrl?: string | null;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  mentorTitle?: string | null;
  mentorCompany?: string | null;
  mentorYearsExperience?: string | null;
  mentorExpertise?: string[] | null;
  mentorMentorshipFocus?: string | null;
  mentorAvailabilityPref?: string | null;
  mentorMaxMenteesPref?: string | null;
  mentorCertifications?: string | null;
  mentorAvailabilityJson?: Record<string, unknown> | null;
  mentorOnboardingComplete?: boolean;
};

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alive = await prisma.user.findFirst({
    where: { id: session.user.id, ...getActiveUserWhere() },
    select: { id: true },
  });
  if (!alive) {
    return NextResponse.json({ error: "Account closed." }, { status: 403 });
  }

  const body = (await req.json()) as ProfilePayload;

  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.image !== undefined) data.image = body.image;
  if (body.role !== undefined) data.role = body.role;
  if (body.university !== undefined) data.university = body.university;
  if (body.yearOfStudy !== undefined) data.yearOfStudy = body.yearOfStudy;
  if (body.major !== undefined) data.major = body.major;
  if (body.country !== undefined) data.country = body.country;
  if (body.city !== undefined) data.city = body.city;
  if (body.interests !== undefined) data.interests = body.interests;
  if (body.softwareSkills !== undefined) data.softwareSkills = body.softwareSkills;
  if (body.otherInterests !== undefined) data.otherInterests = body.otherInterests;
  if (body.bio !== undefined) data.bio = body.bio;
  if (body.portfolioUrl !== undefined) data.portfolioUrl = body.portfolioUrl;
  if (body.portfolioVisibleToOthers !== undefined) {
    data.portfolioVisibleToOthers = body.portfolioVisibleToOthers;
  }
  if (body.profileComplete !== undefined) data.profileComplete = body.profileComplete;
  if (body.bannerImageUrl !== undefined) data.bannerImageUrl = body.bannerImageUrl;
  if (body.whatsappUrl !== undefined) data.whatsappUrl = body.whatsappUrl;
  if (body.linkedinUrl !== undefined) data.linkedinUrl = body.linkedinUrl;
  if (body.instagramUrl !== undefined) data.instagramUrl = body.instagramUrl;
  if (body.mentorTitle !== undefined) data.mentorTitle = body.mentorTitle;
  if (body.mentorCompany !== undefined) data.mentorCompany = body.mentorCompany;
  if (body.mentorYearsExperience !== undefined) data.mentorYearsExperience = body.mentorYearsExperience;
  if (body.mentorExpertise !== undefined) data.mentorExpertise = body.mentorExpertise;
  if (body.mentorMentorshipFocus !== undefined) data.mentorMentorshipFocus = body.mentorMentorshipFocus;
  if (body.mentorAvailabilityPref !== undefined) data.mentorAvailabilityPref = body.mentorAvailabilityPref;
  if (body.mentorMaxMenteesPref !== undefined) data.mentorMaxMenteesPref = body.mentorMaxMenteesPref;
  if (body.mentorCertifications !== undefined) data.mentorCertifications = body.mentorCertifications;
  if (body.mentorAvailabilityJson !== undefined) data.mentorAvailabilityJson = body.mentorAvailabilityJson;
  if (body.mentorOnboardingComplete !== undefined) data.mentorOnboardingComplete = body.mentorOnboardingComplete;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data,
  });

  invalidateStudentDashboard(session.user.id);
  if (body.mentorAvailabilityJson !== undefined) {
    void delKeys(mentorMonthAvailabilityKeysForMentor(session.user.id));
  }

  const roleAfter = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (roleAfter?.role === "mentor") {
    invalidatePublicMentorsList();
    invalidatePublicMentorProfile(session.user.id);
  }

  return NextResponse.json({ ok: true });
}
