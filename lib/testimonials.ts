import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { formatStudentSubtitle } from "@/components/student/student-profile-types";
import { CACHE_TAG_HOME_TESTIMONIALS } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";

export type HomeTestimonialCard = {
  id: string;
  name: string;
  role: string;
  text: string;
  imageUrl: string | null;
  initials: string;
};

function displayName(name: string | null, email: string | null): string {
  const n = name?.trim();
  if (n) return n;
  const local = email?.split("@")[0]?.trim();
  return local || "Student";
}

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "S";
}

function reviewBody(comment: string | null, tags: unknown, rating: number): string {
  const c = comment?.trim();
  if (c) return c;
  if (Array.isArray(tags) && tags.length > 0) {
    const parts = tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
    if (parts.length) return parts.join(" · ");
  }
  return `Rated ${rating} out of 5.`;
}

type ReviewRow = {
  id: string;
  createdAt: Date;
  rating: number;
  tags: unknown;
  comment: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
  university: string | null;
  yearOfStudy: string | null;
  major: string | null;
};

/**
 * Recent session reviews for the marketing home page.
 * Uses `$queryRaw` so the home page works even if `prisma generate` was skipped locally
 * (Windows dev servers can lock the Prisma engine and block regeneration).
 */
async function fetchHomeTestimonialsUncached(limit: number): Promise<HomeTestimonialCard[]> {
  try {
    const rows = await prisma.$queryRaw<ReviewRow[]>(Prisma.sql`
      SELECT
        sr.id,
        sr."createdAt",
        sr.rating,
        sr.tags,
        sr.comment,
        u.name,
        u.email,
        u.image,
        u.university,
        u."yearOfStudy",
        u.major
      FROM "SessionReview" sr
      INNER JOIN "User" u ON u.id = sr."studentId"
      ORDER BY sr."createdAt" DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => {
      const name = displayName(r.name, r.email);
      return {
        id: r.id,
        name,
        role: formatStudentSubtitle({
          major: r.major,
          yearOfStudy: r.yearOfStudy,
          university: r.university,
        }),
        text: reviewBody(r.comment, r.tags, r.rating),
        imageUrl: r.image?.trim() || null,
        initials: initialsFromName(name),
      };
    });
  } catch (e) {
    console.error("[getHomeTestimonials]", e);
    return [];
  }
}

/** Cached across requests; invalidated via {@link CACHE_TAG_HOME_TESTIMONIALS} on new session reviews. */
export async function getHomeTestimonials(limit = 16): Promise<HomeTestimonialCard[]> {
  return unstable_cache(
    async () => fetchHomeTestimonialsUncached(limit),
    ["home-testimonials", String(limit)],
    { revalidate: 120, tags: [CACHE_TAG_HOME_TESTIMONIALS] },
  )();
}
