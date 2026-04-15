import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { DatabaseUnavailableError } from "@/lib/prisma-errors";
import { getStudentDashboardPayload } from "@/lib/student-dashboard-data";
import { CacheKeys, CacheTtl, withJsonCache } from "@/lib/redis-cache";

export const runtime = "nodejs";

export async function GET() {
  const t0 = Date.now();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = CacheKeys.studentDashboard(session.user.id);
  let payload;
  try {
    payload = await withJsonCache(key, CacheTtl.studentDashboard, () =>
      getStudentDashboardPayload(session.user.id),
    );
  } catch (e) {
    if (e instanceof DatabaseUnavailableError) {
      return NextResponse.json({ error: "Database temporarily unavailable" }, { status: 503 });
    }
    throw e;
  }
  if (!payload) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (process.env.NODE_ENV === "development") {
    console.info(`[perf] GET /api/student/dashboard ${Date.now() - t0}ms`);
  }

  return NextResponse.json(payload);
}
