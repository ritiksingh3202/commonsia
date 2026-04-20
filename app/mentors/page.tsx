import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { unstable_cache } from "next/cache";

import { getPublicMentors } from "@/lib/mentor-directory";
import { PUBLIC_MENTORS_REVALIDATE_TAG } from "@/lib/redis-cache";

const MentorsPage = dynamic(
  () => import("@/components/mentors/MentorsPage").then((m) => m.MentorsPage),
  {
    loading: () => (
      <div className="mx-auto min-h-[50vh] max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 h-12 max-w-md animate-pulse rounded-xl bg-neutral-200/90" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      </div>
    ),
  },
);

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
