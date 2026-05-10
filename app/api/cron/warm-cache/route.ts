import { NextResponse } from "next/server";
import { getCategoryPostCounts, getCommunityStats, getPublicCommunityFeed } from "@/lib/forum-feed";
import type { ForumCategorySlug } from "@/lib/forum-categories";

export const runtime = "nodejs";
export const maxDuration = 60;

const CATEGORY_SLUGS: (ForumCategorySlug | null)[] = [
  null, // "all"
  "bachelors",
  "masters",
  "phd",
  "thesis",
  "competitions",
  "faculty-grants",
  "startup-calls",
];

/**
 * Pre-warms the Redis cache for all community feed categories.
 * Runs every 25 minutes via Vercel cron so the 30-min TTL never expires
 * between cron runs — community pages always serve from Redis, not the DB.
 *
 * Auth: same CRON_SECRET used by the RSS-pull cron.
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (expected) {
    const got = req.headers.get("authorization")?.trim() ?? "";
    if (got !== `Bearer ${expected}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const start = Date.now();

  // Warm all category feeds + stats + counts in parallel
  await Promise.all([
    ...CATEGORY_SLUGS.map((slug) => getPublicCommunityFeed(slug ?? undefined)),
    getCommunityStats(),
    getCategoryPostCounts(),
  ]);

  return NextResponse.json(
    { ok: true, warmedCategories: CATEGORY_SLUGS.length, ms: Date.now() - start },
    { status: 200 },
  );
}
