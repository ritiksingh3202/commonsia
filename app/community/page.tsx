import type { Metadata } from "next";

import { auth } from "@/auth";
import { CategoryGrid } from "@/components/community/CategoryGrid";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { StartThreadButton } from "@/components/community/StartThreadButton";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { getCategoryPostCounts, getPublicCommunityFeed } from "@/lib/forum-feed";

export const metadata: Metadata = {
  title: { absolute: "Community Forum" },
  description: "Competitions, opportunities, and discussions for the architecture community.",
};

export const revalidate = 60;

export default async function CommunityPage() {
  const [posts, counts, session] = await Promise.all([
    getPublicCommunityFeed(),
    getCategoryPostCounts(),
    auth(),
  ]);
  const userId = session?.user?.id ?? null;

  return (
    <MarketingShell>
      {/* Hero header — same warm gradient as the front page */}
      <section className="home-hero-gradient px-4 pb-12 pt-14 text-center sm:pb-14 sm:pt-20 sm:px-6">
        <h1 className="font-heading text-[clamp(2rem,3.5vw+1rem,3rem)] font-semibold tracking-tight text-[#0a0a0a]">
          Community Forum
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-neutral-500 sm:max-w-md sm:text-base">
          Competitions, opportunities, and discussions for the architecture community.
        </p>
        <div className="mt-7 flex justify-center">
          <StartThreadButton userId={userId} callbackUrl="/community" />
        </div>
      </section>

      {/* Body */}
      <div className="bg-white pb-20">
        {/* Category grid */}
        <div className="mt-10 px-4 sm:mt-12 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <p className="mb-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
              Browse by Category
            </p>
            <CategoryGrid counts={counts} />
          </div>
        </div>

        {/* Latest posts */}
        <div className="mt-14 px-4 sm:mt-16 sm:px-6">
          <div className="mx-auto mb-6 flex max-w-2xl items-center gap-4">
            <div className="h-px flex-1 bg-neutral-100" />
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Latest</p>
            <div className="h-px flex-1 bg-neutral-100" />
          </div>
          <CommunityFeed posts={posts} />
        </div>
      </div>
    </MarketingShell>
  );
}
