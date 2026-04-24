import { NextResponse } from "next/server";

import { withPoolFallback } from "@/lib/db-resilient";
import { formatMentorAvailabilityPatternLabel } from "@/lib/mentor-availability-display";
import { buildMonthlyWeekdayConsumedMap } from "@/lib/mentor-monthly-booking";
import {
  NO_UPCOMING_AVAILABILITY_LABEL,
  formatNextAvailableSlotLine,
} from "@/lib/mentor-next-slot";
import { getActiveUserWhere } from "@/lib/user-active";

export const runtime = "nodejs";
/**
 * Always compute fresh on request — the whole point of this endpoint is "as of right now,
 * what is the next available slot?". Static/ISR caching would defeat the real-time intent
 * on the mentor profile page. The DB payload is tiny (one `user` row + 6mo bookings), so
 * the cost is well within what polling every 45s can absorb.
 */
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Returns the mentor's "next available" slot line + short availability pattern label, freshly
 * computed from the current DB state. Used by `PublicMentorProfile` to keep the visible
 * "Next Available" card accurate as time advances — without relying on the page's 60s ISR
 * revalidation window (which can leave the label pointing at a slot that's already started).
 *
 * Security: The mentor directory is public by design, and this endpoint only exposes a
 * synthesized human label ("Next available: Monday, 10:00 AM"). No raw availability JSON,
 * bookings, or PII are returned.
 *
 * Caching: `Cache-Control: private, no-store` — every call recomputes. The Redis-cached
 * `publicMentorProfile` JSON is intentionally bypassed here (it freezes the `slot` string
 * for 60s after it was last written, which is exactly what we're trying to avoid).
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { id: rawId } = await ctx.params;
  const id = rawId?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing mentor id" }, { status: 400 });
  }

  try {
    const result = await withPoolFallback(async (client) => {
      const since = new Date();
      since.setMonth(since.getMonth() - 6);
      /**
       * Parallelize the two reads: mentor availability + last 6 months of bookings for the
       * monthly-weekday cap. Sequential awaits here add ~1 extra round-trip that directly
       * blocks the polling response.
       */
      const [u, bookings] = await Promise.all([
        client.user.findFirst({
          where: {
            ...getActiveUserWhere(),
            id,
            role: "mentor",
            mentorOnboardingComplete: true,
          },
          select: { id: true, mentorAvailabilityJson: true },
        }),
        client.mentoringBooking.findMany({
          where: { mentorId: id, startAt: { gte: since } },
          select: { mentorId: true, startAt: true },
        }),
      ]);
      if (!u) return null;
      const monthlyConsumed = buildMonthlyWeekdayConsumedMap(
        [{ id: u.id, mentorAvailabilityJson: u.mentorAvailabilityJson }],
        bookings,
      );
      const now = new Date();
      const slot = formatNextAvailableSlotLine(
        u.mentorAvailabilityJson,
        now,
        (year, monthIndex0) => monthlyConsumed.get(`${u.id}:${year}-${monthIndex0}`) ?? false,
      );
      const availabilityPattern = formatMentorAvailabilityPatternLabel(u.mentorAvailabilityJson);
      return { slot, availabilityPattern };
    }, { label: "mentorNextSlot" });

    if (!result) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        slot: result.slot,
        availabilityPattern: result.availabilityPattern,
        hasUpcoming: result.slot.trim() !== NO_UPCOMING_AVAILABILITY_LABEL,
        refreshedAtIso: new Date().toISOString(),
      },
      {
        headers: {
          /**
           * Never cache at the browser or CDN — the value is only useful if it reflects
           * current wall-clock time. Polling clients set their own interval.
           */
          "Cache-Control": "private, no-store, must-revalidate",
        },
      },
    );
  } catch (err) {
    console.warn("[api/mentors/:id/next-slot] DB read failed:", err);
    /** Return 503 so clients can quietly keep the last-known value instead of showing an error. */
    return NextResponse.json(
      { error: "Temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
