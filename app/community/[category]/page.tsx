import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { CommunityCategoryNav } from "@/components/community/CommunityCategoryNav";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { CommunityStatsStrip } from "@/components/community/CommunityStats";
import { StartThreadButton } from "@/components/community/StartThreadButton";
import { MarketingShell } from "@/components/layout/MarketingShell";
import {
  FORUM_CATEGORIES,
  categoryMeta,
  isValidCategorySlug,
  type ForumCategorySlug,
} from "@/lib/forum-categories";
import { getCommunityStats, getPublicCommunityFeed } from "@/lib/forum-feed";

type Props = { params: Promise<{ category: string }> };

export const revalidate = 60;

export function generateStaticParams() {
  return FORUM_CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const meta = isValidCategorySlug(category) ? categoryMeta(category) : null;
  return {
    title: { absolute: meta ? `${meta.label} — Community Forum` : "Community Forum" },
    description: meta
      ? `${meta.label} updates and opportunities shared with the Commonsia community.`
      : "Commonsia community forum.",
  };
}

export default async function CommunityCategoryPage({ params }: Props) {
  const { category } = await params;
  if (!isValidCategorySlug(category)) notFound();
  const slug = category as ForumCategorySlug;
  const [posts, stats, session] = await Promise.all([
    getPublicCommunityFeed(slug),
    getCommunityStats(),
    auth(),
  ]);
  const meta = categoryMeta(slug);
  const userId = session?.user?.id ?? null;
  const callbackUrl = `/community/${slug}`;

  return (
    <MarketingShell>
      <div className="bg-[#fafafa] pb-16 pt-8 sm:pt-10">
        <header className="mx-auto mb-6 max-w-2xl px-4 text-center sm:mb-8 sm:px-6">
          <h1 className="font-heading text-[1.5rem] font-semibold tracking-tight text-[#0a0a0a] sm:text-[1.75rem]">
            {meta?.label ?? "Community"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Posts, links, and opportunities tagged for {meta?.label.toLowerCase() ?? "this category"}.
          </p>
        </header>
        <div className="px-4 sm:px-6">
          <CommunityStatsStrip initial={stats} />
          <CommunityCategoryNav active={slug} />
          <div className="mx-auto mb-4 flex max-w-2xl justify-end">
            <StartThreadButton userId={userId} callbackUrl={callbackUrl} />
          </div>
          <CommunityFeed posts={posts} />
        </div>
      </div>
    </MarketingShell>
  );
}
