import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { getActiveUserWhere } from "@/lib/user-active";

import type { ForumCategorySlug } from "@/lib/forum-categories";

export type CommunityPost = {
  id: string;
  text: string | null;
  imageUrl: string | null;
  links: string[];
  postedAt: string;
  category: ForumCategorySlug | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
  replyCount: number;
  author: {
    name: string | null;
    image: string | null;
  };
};

export type ForumReplyRow = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    name: string | null;
    image: string | null;
    role: string | null;
  };
};

const FEED_PAGE_SIZE = 50;

async function getPublicCommunityFeedImpl(category?: ForumCategorySlug | null): Promise<CommunityPost[]> {
  try {
    const rows = await prisma.forumPost.findMany({
      where: {
        deletedAt: null,
        ...(category ? { category } : {}),
      },
      orderBy: { postedAt: "desc" },
      take: FEED_PAGE_SIZE,
      select: {
        id: true,
        text: true,
        imageUrl: true,
        links: true,
        postedAt: true,
        category: true,
        sourceLabel: true,
        sourceUrl: true,
        author: { select: { name: true, image: true } },
        _count: { select: { replies: { where: { deletedAt: null } } } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      text: r.text,
      imageUrl: r.imageUrl,
      links: r.links,
      postedAt: r.postedAt.toISOString(),
      category: (r.category as ForumCategorySlug | null) ?? null,
      sourceLabel: r.sourceLabel,
      sourceUrl: r.sourceUrl,
      replyCount: r._count.replies,
      author: { name: r.author.name, image: r.author.image },
    }));
  } catch (e) {
    console.error("[forum-feed] read failed:", e);
    return [];
  }
}

/** Request-scoped memoization so page + metadata renders share the query. */
export const getPublicCommunityFeed = cache(getPublicCommunityFeedImpl);

export type CommunityStats = {
  mentorCount: number;
  studentCount: number;
  postCount: number;
};

async function getCommunityStatsImpl(): Promise<CommunityStats> {
  const activeWhere = getActiveUserWhere();
  try {
    const [mentorCount, studentCount, postCount] = await Promise.all([
      prisma.user.count({ where: { role: "mentor", mentorOnboardingComplete: true, ...activeWhere } }),
      prisma.user.count({ where: { role: "student", ...activeWhere } }),
      prisma.forumPost.count({ where: { deletedAt: null } }),
    ]);
    return { mentorCount, studentCount, postCount };
  } catch (e) {
    console.error("[forum-feed] stats read failed:", e);
    return { mentorCount: 0, studentCount: 0, postCount: 0 };
  }
}

export const getCommunityStats = cache(getCommunityStatsImpl);

export async function getForumPost(id: string): Promise<(CommunityPost & { authorRole: string | null }) | null> {
  try {
    const r = await prisma.forumPost.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        text: true,
        imageUrl: true,
        links: true,
        postedAt: true,
        category: true,
        sourceLabel: true,
        sourceUrl: true,
        author: { select: { name: true, image: true, role: true } },
        _count: { select: { replies: { where: { deletedAt: null } } } },
      },
    });
    if (!r) return null;
    return {
      id: r.id,
      text: r.text,
      imageUrl: r.imageUrl,
      links: r.links,
      postedAt: r.postedAt.toISOString(),
      category: (r.category as ForumCategorySlug | null) ?? null,
      sourceLabel: r.sourceLabel,
      sourceUrl: r.sourceUrl,
      replyCount: r._count.replies,
      author: { name: r.author.name, image: r.author.image },
      authorRole: r.author.role,
    };
  } catch (e) {
    console.error("[forum-feed] getForumPost failed:", e);
    return null;
  }
}

export async function getForumReplies(postId: string): Promise<ForumReplyRow[]> {
  try {
    const rows = await prisma.forumReply.findMany({
      where: { postId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { name: true, image: true, role: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      author: { name: r.author.name, image: r.author.image, role: r.author.role },
    }));
  } catch (e) {
    console.error("[forum-feed] getForumReplies failed:", e);
    return [];
  }
}
