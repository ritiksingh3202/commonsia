import type { Metadata } from "next";
import Link from "next/link";
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

  const accentColor = meta && "accent" in meta ? (meta as { accent: string }).accent : "#ff6600";

  return (
    <MarketingShell>
      {/* Category header — warm gradient with accent underline */}
      <section className="home-hero-gradient px-4 pb-10 pt-12 text-center sm:pb-12 sm:pt-16 sm:px-6">
        {/* Back link */}
        <div className="mb-5 flex justify-center">
          <Link
            href="/community"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 transition hover:text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Community Forum
          </Link>
        </div>

        {/* Accent bar */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: accentColor }} />

        <h1 className="font-heading text-[clamp(1.75rem,3vw+1rem,2.75rem)] font-semibold tracking-tight text-[#0a0a0a]">
          {meta?.label ?? "Community"}
        </h1>
        {meta && "description" in meta && (
          <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-neutral-500 sm:max-w-md sm:text-[15px]">
            {(meta as { description?: string }).description}
          </p>
        )}
        <div className="mt-6 flex justify-center">
          <StartThreadButton userId={userId} callbackUrl={callbackUrl} />
        </div>
      </section>

      {/* Body */}
      <div className="bg-white pb-20">
        {/* Stats — floats up over gradient seam */}
        <div className="px-4 sm:px-6">
          <div className="mx-auto -mt-6 max-w-2xl sm:-mt-7">
            <CommunityStatsStrip initial={stats} />
          </div>
        </div>

        {/* Category switcher tabs */}
        <div className="mt-8 px-4 sm:mt-10 sm:px-6">
          <CommunityCategoryNav active={slug} />
        </div>

        {/* Feed */}
        <div className="mt-4 px-4 sm:px-6">
          <CommunityFeed posts={posts} />
        </div>
      </div>
    </MarketingShell>
  );
}
