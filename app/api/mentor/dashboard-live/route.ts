import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getMentorDashboardLiveData } from "@/lib/mentor-dashboard-stats";

export const runtime = "nodejs";

/**
 * Live mentor dashboard slice (upcoming sessions, stats, activity) for client polling
 * after a student booking is accepted on WhatsApp / Calendar.
 *
 * Role is read from the JWT session (no extra DB round-trip). Data is cached in Redis
 * for 30 s via `getMentorDashboardLiveData` so repeated polls in quick succession
 * (StrictMode double-invoke, visibility-change, multi-tab) hit Redis instead of re-running
 * 12 parallel DB queries.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  /** Role is embedded in the JWT — no DB query needed. */
  if (session.user.role !== "mentor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await getMentorDashboardLiveData(session.user.id);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
