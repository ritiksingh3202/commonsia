import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getMentorDashboardLiveData } from "@/lib/mentor-dashboard-stats";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Live mentor dashboard slice (upcoming sessions, stats, activity) for client polling
 * after a student booking is accepted on WhatsApp / Calendar.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (me?.role !== "mentor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await getMentorDashboardLiveData(session.user.id);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-store, must-revalidate" },
  });
}
