import type { Metadata } from "next";
import nextDynamic from "next/dynamic";

import { getPublicMentors, type Mentor } from "@/lib/mentor-directory";

/**
 * Fisher–Yates shuffle — O(n), zero allocations beyond the result array. We shuffle a copy so
 * the cached list returned by `getPublicMentors()` (shared across requests) stays untouched.
 */
function shuffleMentors(list: readonly Mentor[]): Mentor[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const MentorsPage = nextDynamic(
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

/**
 * Render fresh on every request. The `unstable_cache` wrapper that used to live here could
 * lock the page into an empty list if a single request got an empty payload (transient DB
 * hiccup, cold start, stale Redis after a deploy) — the edge cached `[]` and kept serving it
 * for the full 60s window across every visitor. `getPublicMentors()` already has its own
 * Redis-backed cache with empty-result guarding, so the extra layer adds staleness without
 * meaningful perf gain.
 */
export const dynamic = "force-dynamic";

export default async function MentorsRoute() {
  const mentors = await getPublicMentors();
  /**
   * Randomize directory order on every visit — the cached list is still alphabetical (stable
   * cache key, small payload) but each request serves a fresh shuffle so no single mentor is
   * permanently at the top. Users who want deterministic order can still pick A-Z / Z-A from
   * the sort dropdown; that overrides this shuffle on the client.
   */
  const shuffled = shuffleMentors(mentors);
  return <MentorsPage mentors={shuffled} />;
}
