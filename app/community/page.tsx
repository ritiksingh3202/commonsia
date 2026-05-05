import type { Metadata } from "next";

import { auth } from "@/auth";
import { CategoryGrid } from "@/components/community/CategoryGrid";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { CommunityStatsStrip } from "@/components/community/CommunityStats";
import { StartThreadButton } from "@/components/community/StartThreadButton";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { getCategoryPostCounts, getCommunityStats, getPublicCommunityFeed } from "@/lib/forum-feed";

export const metadata: Metadata = {
  title: { absolute: "Community Forum" },
  description: "Competitions, opportunities, and discussions for the architecture community.",
};

export const revalidate = 60;

export default async function CommunityPage() {
  const [posts, stats, counts, session] = await Promise.all([
    getPublicCommunityFeed(),
    getCommunityStats(),
    getCategoryPostCounts(),
    auth(),
  ]);
  const userId = session?.user?.id ?? null;

  return (
    <MarketingShell>
      <div className="bg-[#fafafa] pb-16 pt-8 sm:pt-10">
        {/* Page header */}
        <header className="mx-auto mb-6 max-w-4xl px-4 sm:mb-8 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-heading text-[1.5rem] font-semibold tracking-tight text-[#0a0a0a] sm:text-[1.75rem]">
                Community Forum
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                Competitions, opportunities, and discussions for the architecture community.
              </p>
            </div>
            <div className="shrink-0 pt-1">
              <StartThreadButton userId={userId} callbackUrl="/community" />
            </div>
          </div>
        </header>

        <div className="px-4 sm:px-6">
          {/* Live stats */}
          <div className="mx-auto max-w-4xl">
            <CommunityStatsStrip initial={stats} />
          </div>

          {/* Category discovery grid */}
          <div className="mx-auto mb-10 max-w-4xl sm:mb-12">
            <CategoryGrid counts={counts} />
          </div>

          {/* Recent posts across all categories */}
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-widest text-neutral-400">
              Latest
            </h2>
          </div>
          <CommunityFeed posts={posts} />
        </div>
      </div>
    </MarketingShell>
  );
}
