import { NextResponse } from "next/server";

import { getCommunityStats } from "@/lib/forum-feed";

/** Lightweight stats endpoint used by the Community Forum live counter (polls every 60s). */
export async function GET() {
  const stats = await getCommunityStats();
  return NextResponse.json(stats, {
    headers: { "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=60" },
  });
}

export const runtime = "nodejs";
