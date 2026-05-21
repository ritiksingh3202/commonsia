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

  // Sources whose content is 100% architecture by definition — never remove.
  // Short post text from these sources (e.g. "Bondi Beach Villa / Common Office — ArchDaily")
  // won't contain enough keywords to pass the filter even though it's legitimate content.
  const ARCH_FOCUSED_LABELS = new Set([
    "ArchDaily",
    "Dezeen",
    "Zenodo Architecture",
    "TU Delft A+BE",
    "Mango Architecture",
    "Architexturez",
    "Bustler",
    "Bee Breeders",
  ]);

  // Fetch all live posts
  const posts = await prisma.forumPost.findMany({
    where: { deletedAt: null },
    select: { id: true, text: true, sourceLabel: true },
  });

  const toDelete: string[] = [];
  const kept: Array<{ id: string; preview: string }> = [];

  // Text patterns that indicate the post came from an arch-focused source even
  // when sourceLabel is null (e.g. legacy posts pre-dating the column).
  const ARCH_FOCUSED_TEXT_PATTERNS = [
    /—\s*ArchDaily\s*$/m,                 // "Title\n\n— ArchDaily"
    /^Dezeen\s+(Architecture|Competitions?|Design):/i, // "Dezeen Competitions: …"
    /—\s*Dezeen\s*$/m,                    // "Title\n\n— Dezeen"
    /\bBustler\b/i,
    /\bBee\s+Breeders\b/i,
  ];

  for (const post of posts) {
    const text = post.text ?? "";
    // Always keep posts from architecture-focused RSS sources.
    const isArchFocused =
      (post.sourceLabel && ARCH_FOCUSED_LABELS.has(post.sourceLabel)) ||
      ARCH_FOCUSED_TEXT_PATTERNS.some((re) => re.test(text));
    if (isArchFocused) {
      kept.push({ id: post.id, preview: text.slice(0, 60) });
      continue;
    }
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
