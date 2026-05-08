import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type HomepageStats = {
  mentorCount: number;
  postCount: number;
  /** Up to 3 random mentor avatar URLs for the hero social-proof strip. */
  mentorAvatars: string[];
};

async function fetchUncached(): Promise<HomepageStats> {
  try {
    const [mentorCount, postCount, mentors] = await Promise.all([
      prisma.user.count({
        where: {
          role: "mentor",
          mentorOnboardingComplete: true,
          accountDeletedAt: null,
        },
      }),
      prisma.forumPost.count({
        where: { deletedAt: null },
      }),
      // Fetch a pool of 20 mentors with real photos, then pick 3 randomly so
      // the avatars feel fresh across deploys without a DB random() call.
      prisma.user.findMany({
        where: {
          role: "mentor",
          mentorOnboardingComplete: true,
          accountDeletedAt: null,
          image: { not: null },
        },
        select: { image: true },
        take: 20,
      }),
    ]);

    // Fisher-Yates shuffle on the pool, then take first 3
    const pool = mentors.map((m) => m.image as string);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const mentorAvatars = pool.slice(0, 3);

    return { mentorCount, postCount, mentorAvatars };
  } catch {
    return { mentorCount: 100, postCount: 200, mentorAvatars: [] };
  }
}

/** Cached for 1 hour — counts don't need real-time precision. */
export const getHomepageStats = () =>
  unstable_cache(fetchUncached, ["homepage-stats"], { revalidate: 3600 })();
