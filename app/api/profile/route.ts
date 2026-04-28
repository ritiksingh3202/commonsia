import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import {
  COVER_IMAGE_SIZE_LABEL,
  MAX_COVER_IMAGE_BYTES,
  MAX_PROFILE_IMAGE_BYTES,
  PROFILE_IMAGE_SIZE_LABEL,
  dataUrlByteLength,
  formatBytesShort,
  isDataUrl,
} from "@/lib/profile-image-limits";
import { getActiveUserWhere } from "@/lib/user-active";
import {
  delKeys,
  invalidatePublicMentorProfile,
  invalidatePublicMentorsList,
  invalidateStudentDashboard,
  mentorScheduleCacheKeysAfterAvailabilitySave,
} from "@/lib/redis-cache";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Validate an incoming profile/cover image value against the shared upload cap.
 *
 * Intentionally skips:
 *   - `undefined` — the client didn't touch this field.
 *   - `null` or empty string — the user is clearing their photo.
 *   - `http(s)` URLs — OAuth providers (Google, LinkedIn) and existing CDN
 *     references for mentors; those are already bounded by the remote host.
 *
 * Only `data:` URLs produced by our client cropper/compressor hit the size
 * check. This preserves the promise that *existing* users keep their photos
 * regardless of how large they were encoded historically — nothing is
 * validated on read, only on write.
 */
function validateImagePayload(
  value: unknown,
  kind: "profile" | "cover",
): { ok: true } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true };
  if (typeof value !== "string") return { ok: false, error: "Invalid image value" };
  const s = value.trim();
  if (!s) return { ok: true };
  if (/^https?:\/\//i.test(s)) return { ok: true };
  if (!isDataUrl(s)) return { ok: false, error: "Unsupported image format" };

  const cap = kind === "profile" ? MAX_PROFILE_IMAGE_BYTES : MAX_COVER_IMAGE_BYTES;
  const label = kind === "profile" ? PROFILE_IMAGE_SIZE_LABEL : COVER_IMAGE_SIZE_LABEL;
  const bytes = dataUrlByteLength(s);
  if (bytes > cap) {
    return {
      ok: false,
      error: `${kind === "profile" ? "Profile photo" : "Cover image"} must be ${label} or smaller (received ${formatBytesShort(bytes)}).`,
    };
  }
  return { ok: true };
}

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

  const body = (await req.json()) as ProfilePayload;

  /**
   * Size-gate both image fields *before* we touch Prisma. `data:` URLs written
   * by the client cropper are capped at 500 KB of decoded bytes; http(s) URLs
   * (OAuth avatars, CDN banners) and nulls (photo removal) bypass the check.
   * This means a stale image stored long before this cap existed still works
   * on read, but the moment a user re-uploads they land under the new limit.
   */
  if (body.image !== undefined) {
    const check = validateImagePayload(body.image, "profile");
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 413 });
    }
  }
  if (body.bannerImageUrl !== undefined) {
    const check = validateImagePayload(body.bannerImageUrl, "cover");
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 413 });
    }
  }

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

  /**
   * Single DB round-trip: combine the previously-separate "is user still active?" probe,
   * the actual UPDATE, and the "what role is this now?" read into one statement. Profile
   * setup auto-saves fire on every keystroke, so collapsing 3 sequential queries (each one
   * a full Postgres round-trip on Neon/Supabase) makes saves feel instant.
   *
   * P2025 = record to update not found — happens when the account is soft-deleted (the
   * `accountDeletedAt: null` filter below excludes it) or the user row was removed out of
   * band. Map it to 403 to match the old "Account closed." response.
   */
  let updated: { role: string | null };
  try {
    updated = await prisma.user.update({
      where: { id: session.user.id, ...getActiveUserWhere() },
      data,
      select: { role: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Account closed." }, { status: 403 });
    }
    throw err;
  }

  /** All cache invalidations are fire-and-forget so they never block the HTTP response. */
  invalidateStudentDashboard(session.user.id);
  if (body.mentorAvailabilityJson !== undefined) {
    void delKeys(mentorScheduleCacheKeysAfterAvailabilitySave(session.user.id));
  }
  if (updated.role === "mentor") {
    invalidatePublicMentorsList();
    invalidatePublicMentorProfile(session.user.id);
  }

  return NextResponse.json({ ok: true });
}
