import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export type ProfilePayload = {
  name?: string | null;
  /** Profile photo — data URL or HTTPS (Auth.js `image` field) */
  image?: string | null;
  role?: "student" | "mentor";
  university?: string | null;
  yearOfStudy?: string | null;
  major?: string | null;
  interests?: string[] | null;
  softwareSkills?: string | null;
  otherInterests?: string | null;
  bio?: string | null;
  portfolioUrl?: string | null;
  profileComplete?: boolean;
  bannerImageUrl?: string | null;
  whatsappUrl?: string | null;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
};

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as ProfilePayload;

  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.image !== undefined) data.image = body.image;
  if (body.role !== undefined) data.role = body.role;
  if (body.university !== undefined) data.university = body.university;
  if (body.yearOfStudy !== undefined) data.yearOfStudy = body.yearOfStudy;
  if (body.major !== undefined) data.major = body.major;
  if (body.interests !== undefined) data.interests = body.interests;
  if (body.softwareSkills !== undefined) data.softwareSkills = body.softwareSkills;
  if (body.otherInterests !== undefined) data.otherInterests = body.otherInterests;
  if (body.bio !== undefined) data.bio = body.bio;
  if (body.portfolioUrl !== undefined) data.portfolioUrl = body.portfolioUrl;
  if (body.profileComplete !== undefined) data.profileComplete = body.profileComplete;
  if (body.bannerImageUrl !== undefined) data.bannerImageUrl = body.bannerImageUrl;
  if (body.whatsappUrl !== undefined) data.whatsappUrl = body.whatsappUrl;
  if (body.linkedinUrl !== undefined) data.linkedinUrl = body.linkedinUrl;
  if (body.instagramUrl !== undefined) data.instagramUrl = body.instagramUrl;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data,
  });

  return NextResponse.json({ ok: true });
}
