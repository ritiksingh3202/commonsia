import { auth } from "@/auth";
import { NextResponse } from "next/server";

/** Placeholder: accepts session review payload until a Review model exists. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      mentorName?: string;
      sessionType?: string;
      durationMinutes?: number;
      dateDisplay?: string;
      rating?: number;
      tags?: string[];
      comment?: string | null;
    };

    if (typeof body.rating !== "number" || body.rating < 1 || body.rating > 5) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    // TODO: persist to DB when SessionReview model is added
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
