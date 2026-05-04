import type { Metadata } from "next";

import { CommunityCategoryNav } from "@/components/community/CommunityCategoryNav";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { CommunityStatsStrip } from "@/components/community/CommunityStats";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { getCommunityStats, getPublicCommunityFeed } from "@/lib/forum-feed";

export const metadata: Metadata = {
  title: { absolute: "Community Forum" },
  description: "Updates, links, and posts shared with the Commonsia community.",
};

export const revalidate = 60;

export default async function CommunityPage() {
  const [posts, stats] = await Promise.all([getPublicCommunityFeed(), getCommunityStats()]);
  return (
    <MarketingShell>
      <div className="bg-[#fafafa] pb-16 pt-8 sm:pt-10">
        <header className="mx-auto mb-6 max-w-2xl px-4 text-center sm:mb-8 sm:px-6">
          <h1 className="font-heading text-[1.5rem] font-semibold tracking-tight text-[#0a0a0a] sm:text-[1.75rem]">
            Community Forum
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Updates, links, and reflections shared by Commonsia.
          </p>
        </header>
        <div className="px-4 sm:px-6">
          <CommunityStatsStrip initial={stats} />
          <CommunityCategoryNav active={null} />
          <CommunityFeed posts={posts} />
        </div>
      </div>
    </MarketingShell>
  );
}
