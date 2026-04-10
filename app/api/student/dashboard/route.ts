import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getStudentDashboardPayload } from "@/lib/student-dashboard-data";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await getStudentDashboardPayload(session.user.id);
  if (!payload) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(payload);
}
