import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { pullForumRssOnce } from "@/lib/forum-rss-puller";
import { invalidateCommunityFeedCache } from "@/lib/redis-cache";

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
  if (summary.newPosts > 0) {
    // Bust Next.js data cache + Redis community keys so fresh posts appear immediately
    try { revalidatePath("/community"); } catch { /* noop */ }
    invalidateCommunityFeedCache();
  }
  return NextResponse.json({ ok: true, ...summary }, { status: 200 });
}
