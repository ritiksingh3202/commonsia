import type { Metadata } from "next";
import { unstable_cache } from "next/cache";

import { MentorsPage } from "@/components/mentors/MentorsPage";
import { getPublicMentors } from "@/lib/mentor-directory";
import { PUBLIC_MENTORS_REVALIDATE_TAG } from "@/lib/redis-cache";

export const metadata: Metadata = {
  title: { absolute: "Mentors" },
};

/** ISR fallback; list data is also cached via `unstable_cache` + Redis + `revalidateTag` on mentor updates. */
export const revalidate = 60;

const getCachedMentorsForPage = unstable_cache(
  async () => getPublicMentors(),
  ["mentors-directory"],
  { revalidate: 60, tags: [PUBLIC_MENTORS_REVALIDATE_TAG] },
);

export default async function MentorsRoute() {
  const mentors = await getCachedMentorsForPage();
  return <MentorsPage mentors={mentors} />;
}
