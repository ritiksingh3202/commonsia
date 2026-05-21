import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withJsonCache } from "@/lib/redis-cache";

export const runtime = "nodejs";

/** GET /api/stats — public, cached 10 min. Returns live platform counts. */
export async function GET() {
  const data = await withJsonCache(
    "commonsia:v1:public:stats",
    600,
    async () => {
      const mentorCount = await prisma.user.count({
        where: { role: "mentor", mentorOnboardingComplete: true, accountDeletedAt: null },
      });
      return { mentorCount };
    },
  );

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=120" },
  });
}
