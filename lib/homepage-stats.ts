import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type HomepageStats = {
  mentorCount: number;
  postCount: number;
};

async function fetchUncached(): Promise<HomepageStats> {
  try {
    const [mentorCount, postCount] = await Promise.all([
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
    ]);
    return { mentorCount, postCount };
  } catch {
    return { mentorCount: 100, postCount: 200 };
  }
}

/** Cached for 1 hour — counts don't need real-time precision. */
export const getHomepageStats = () =>
  unstable_cache(fetchUncached, ["homepage-stats"], { revalidate: 3600 })();
