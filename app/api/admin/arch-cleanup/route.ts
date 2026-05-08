import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isArchitectureRelevant } from "@/lib/forum-arch-filter";
import { invalidateCommunityFeedCache } from "@/lib/redis-cache";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * One-time (and repeatable) admin endpoint: soft-deletes ForumPosts that are
 * not relevant to architecture or allied fields.
 *
 * Auth: same CRON_SECRET used by the RSS-pull cron.
 *
 * GET /api/admin/arch-cleanup?dry=true   → preview only (no DB writes)
 * GET /api/admin/arch-cleanup            → actually soft-delete
 *
 * Posts from archFocused sources (Dezeen, ArchDaily, Bustler, Bee Breeders)
 * always pass — they are 100 % architecture by definition and their
 * titles / descriptions would pass the filter anyway.
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (expected) {
    const got = req.headers.get("authorization")?.trim() ?? "";
    if (got !== `Bearer ${expected}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry") === "true";

  // Fetch all live posts
  const posts = await prisma.forumPost.findMany({
    where: { deletedAt: null },
    select: { id: true, text: true, sourceLabel: true },
  });

  const toDelete: string[] = [];
  const kept: Array<{ id: string; preview: string }> = [];

  for (const post of posts) {
    const text = post.text ?? "";
    if (!isArchitectureRelevant(text, text)) {
      toDelete.push(post.id);
    } else {
      kept.push({ id: post.id, preview: text.slice(0, 60) });
    }
  }

  const deletedPreviews = toDelete.map((id) => {
    const p = posts.find((x) => x.id === id);
    return { id, preview: (p?.text ?? "").slice(0, 80) };
  });

  if (!dryRun && toDelete.length > 0) {
    await prisma.forumPost.updateMany({
      where: { id: { in: toDelete } },
      data: { deletedAt: new Date() },
    });
    invalidateCommunityFeedCache();
  }

  return NextResponse.json(
    {
      ok: true,
      dryRun,
      totalScanned: posts.length,
      keptCount: kept.length,
      removedCount: toDelete.length,
      removed: deletedPreviews,
    },
    { status: 200 },
  );
}
