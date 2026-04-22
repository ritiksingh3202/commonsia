import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { formatStudentSubtitle } from "@/components/student/student-profile-types";
import { mentorReviewsTag } from "@/lib/cache-tags";
import { withPoolFallback } from "@/lib/db-resilient";
import { prismaGeneratedClientHasAccountDeletedAt } from "@/lib/user-active";

export type PublicMentorReview = {
  id: string;
  text: string;
  name: string;
  meta: string;
  initials: string;
  rating: number;
};

function displayName(name: string | null, email: string | null): string {
  const n = name?.trim();
  if (n) return n;
  const local = email?.split("@")[0]?.trim();
  return local || "Student";
}

function initialsFromName(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "S"
  );
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
  university: string | null;
  yearOfStudy: string | null;
  major: string | null;
};

async function fetchPublicReviewsUncached(mentorUserId: string, limit: number): Promise<PublicMentorReview[]> {
  try {
    const rows = await withPoolFallback(
      (client) =>
        client.$queryRaw<ReviewRow[]>(Prisma.sql`
          SELECT
            sr.id,
            sr."createdAt",
            sr.rating,
            sr.tags,
            sr.comment,
            u.name,
            u.email,
            u.university,
            u."yearOfStudy",
            u.major
          FROM "SessionReview" sr
          INNER JOIN "User" u ON u.id = sr."studentId"
          WHERE sr."mentorId" = ${mentorUserId}
            ${prismaGeneratedClientHasAccountDeletedAt() ? Prisma.sql`AND u."accountDeletedAt" IS NULL` : Prisma.empty}
          ORDER BY sr."createdAt" DESC
          LIMIT ${limit}
        `),
      { label: "getPublicReviewsForMentor" },
    );

    return rows.map((r) => {
      const name = displayName(r.name, r.email);
      return {
        id: r.id,
        name,
        meta: formatStudentSubtitle({
          major: r.major,
          yearOfStudy: r.yearOfStudy,
          university: r.university,
        }),
        text: reviewBody(r.comment, r.tags, r.rating),
        initials: initialsFromName(name),
        rating: r.rating,
      };
    });
  } catch (e) {
    console.error("[getPublicReviewsForMentor]", e);
    return [];
  }
}

/**
 * Session reviews left for a specific mentor (public profile Reviews tab).
 * Cached across requests; bust via {@link mentorReviewsTag} when a new review is posted.
 */
export async function getPublicReviewsForMentor(mentorUserId: string, limit = 32): Promise<PublicMentorReview[]> {
  return unstable_cache(
    async () => fetchPublicReviewsUncached(mentorUserId, limit),
    ["mentor-public-reviews", mentorUserId, String(limit)],
    { revalidate: 120, tags: [mentorReviewsTag(mentorUserId)] },
  )();
}
