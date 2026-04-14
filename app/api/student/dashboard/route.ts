import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getStudentDashboardPayload } from "@/lib/student-dashboard-data";
import { CacheKeys, CacheTtl, withJsonCache } from "@/lib/redis-cache";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = CacheKeys.studentDashboard(session.user.id);
  const payload = await withJsonCache(key, CacheTtl.studentDashboard, () =>
    getStudentDashboardPayload(session.user.id),
  );
  if (!payload) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(payload);
}
