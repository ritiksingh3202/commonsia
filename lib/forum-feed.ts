import { cache } from "react";

import { prisma } from "@/lib/prisma";

export type CommunityPost = {
  id: string;
  text: string | null;
  imageUrl: string | null;
  links: string[];
  postedAt: string;
  author: {
    name: string | null;
    image: string | null;
  };
};

const FEED_PAGE_SIZE = 50;

async function getPublicCommunityFeedImpl(): Promise<CommunityPost[]> {
  try {
    const rows = await prisma.forumPost.findMany({
      where: { deletedAt: null },
      orderBy: { postedAt: "desc" },
      take: FEED_PAGE_SIZE,
      select: {
        id: true,
        text: true,
        imageUrl: true,
        links: true,
        postedAt: true,
        author: { select: { name: true, image: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      text: r.text,
      imageUrl: r.imageUrl,
      links: r.links,
      postedAt: r.postedAt.toISOString(),
      author: { name: r.author.name, image: r.author.image },
    }));
  } catch (e) {
    console.error("[forum-feed] read failed:", e);
    return [];
  }
}

/** Request-scoped memoization so page + metadata renders share the query. */
export const getPublicCommunityFeed = cache(getPublicCommunityFeedImpl);
