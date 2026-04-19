import { NextResponse } from "next/server";

import { normalizeAvailabilityWindowKind } from "@/components/mentor/mentor-setup-constants";
import { calendarDateToIso, getBookableSlotSegmentsForDate } from "@/lib/booking-availability-slots";
import { mergeAvailabilityForSlot } from "@/lib/mentor-availability-merge";
import { mentorHasBookingOnWeekdayInIstMonth } from "@/lib/mentor-monthly-booking";
import { prisma } from "@/lib/prisma";
import { CacheKeys, CacheTtl, SCHEDULE_API_CACHE_CONTROL, withJsonCache } from "@/lib/redis-cache";

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Returns which days in a month have at least one bookable 30-min segment.
 * Used to disable/fade unavailable dates in the booking calendar (Calendly-like UX).
 *
 * Redis: read-through cache includes Prisma availability resolution.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mentorUserId = url.searchParams.get("mentorUserId")?.trim();
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));

  if (!mentorUserId || !Number.isInteger(year) || !Number.isInteger(month)) {
    return NextResponse.json({ error: "mentorUserId, year, and month are required." }, { status: 400 });
  }
  if (month < 0 || month > 11) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }

  const cacheKey = CacheKeys.mentorMonthAvailability(mentorUserId, year, month);
  const body = await withJsonCache(cacheKey, CacheTtl.mentorMonthAvailability, async () => {
    const user = await prisma.user.findUnique({
      where: { id: mentorUserId },
      select: { role: true, mentorAvailabilityJson: true },
    });

    if (!user || user.role !== "mentor") {
      return null;
    }

    const now = new Date();
    const dim = daysInMonth(year, month);
    const av = mergeAvailabilityForSlot(user.mentorAvailabilityJson);
    let monthlyConsumed = false;
    if (
      normalizeAvailabilityWindowKind(av.availabilityWindowKind) === "monthly" &&
      typeof av.recurringWeekdayJs === "number"
    ) {
      monthlyConsumed = await mentorHasBookingOnWeekdayInIstMonth(
        mentorUserId,
        year,
        month,
        av.recurringWeekdayJs,
      );
    }

    const availableDays: number[] = [];
    for (let d = 1; d <= dim; d++) {
      const slots = getBookableSlotSegmentsForDate(user.mentorAvailabilityJson, year, month, d, now, {
        monthlyPatternConsumedThisIstMonth: monthlyConsumed,
      });
      if (slots.length > 0) availableDays.push(d);
    }

    return {
      ok: true as const,
      availableDays,
      fetchedAt: now.toISOString(),
    };
  });

  if (!body) {
    return NextResponse.json({ error: "Mentor not found." }, { status: 404 });
  }

  return NextResponse.json(body, {
    headers: { "Cache-Control": SCHEDULE_API_CACHE_CONTROL },
  });
}

export const runtime = "nodejs";
