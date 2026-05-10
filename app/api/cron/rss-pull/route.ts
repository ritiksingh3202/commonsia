import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { pullForumRssOnce } from "@/lib/forum-rss-puller";
import { invalidateCommunityFeedCache } from "@/lib/redis-cache";
import { getCategoryPostCounts, getCommunityStats, getPublicCommunityFeed } from "@/lib/forum-feed";
import type { ForumCategorySlug } from "@/lib/forum-categories";

const CATEGORY_SLUGS: (ForumCategorySlug | null)[] = [
  null, "bachelors", "masters", "phd", "thesis", "competitions", "faculty-grants", "startup-calls",
];

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Vercel cron entry point. Schedule lives in vercel.json (every 6 hours).
 *
 * Auth: Vercel signs cron requests with a CRON_SECRET header. Vercel sets
 * `Authorization: Bearer ${CRON_SECRET}` automatically when a project-level
 * env var named CRON_SECRET is set. Without that env, the route still works
 * but anyone could trigger it manually — set CRON_SECRET in Vercel for prod.
 *
 * Author of cron-pulled posts is COMMUNITY_AUTHOR_USER_ID, the same env var
 * used by the WhatsApp inbound flow (consistency on the dashboard).
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (expected) {
    const got = req.headers.get("authorization")?.trim() ?? "";
    if (got !== `Bearer ${expected}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const authorUserId = process.env.COMMUNITY_AUTHOR_USER_ID?.trim();
  if (!authorUserId) {
    return NextResponse.json(
      { ok: false, error: "COMMUNITY_AUTHOR_USER_ID not set; refusing to pull." },
      { status: 503 },
    );
  }

  const summary = await pullForumRssOnce(authorUserId);

  // Always bust + re-warm after a pull so the next visitor hits Redis, not the DB
  try { revalidatePath("/community"); } catch { /* noop */ }
  invalidateCommunityFeedCache();
  // Re-warm in background — don't await so the cron response returns quickly
  void Promise.all([
    ...CATEGORY_SLUGS.map((slug) => getPublicCommunityFeed(slug ?? undefined)),
    getCommunityStats(),
    getCategoryPostCounts(),
  ]);

  return NextResponse.json({ ok: true, ...summary }, { status: 200 });
}
