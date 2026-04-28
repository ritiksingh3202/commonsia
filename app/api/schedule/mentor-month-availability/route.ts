import { NextResponse } from "next/server";

import { normalizeAvailabilityWindowKind } from "@/components/mentor/mentor-setup-constants";
import { getBookableAvailabilityWindowsForDate } from "@/lib/booking-availability-slots";
import { filterSlotsAgainstHeldIntervals, loadMentorHeldSessionIntervals } from "@/lib/mentor-held-booking-slots";
import { mergeAvailabilityForSlot } from "@/lib/mentor-availability-merge";
import { mentorHasBookingOnWeekdayInIstMonth } from "@/lib/mentor-monthly-booking";
import { prisma } from "@/lib/prisma";
import { CacheKeys, CacheTtl, SCHEDULE_API_CACHE_CONTROL, withJsonCache } from "@/lib/redis-cache";

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Returns which days in a month have at least one bookable availability window
 * (after removing slots already held by pending/accepted requests or confirmed bookings).
 */
export async function GET(req: Request) {
  try {
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

    const userRow = await prisma.user.findUnique({
      where: { id: mentorUserId },
      select: { role: true, mentorAvailabilityJson: true },
    });
    if (!userRow || userRow.role !== "mentor") {
      return NextResponse.json({ error: "Mentor not found." }, { status: 404 });
    }

    const av = mergeAvailabilityForSlot(userRow.mentorAvailabilityJson);
    const sessionMin = av.sessionDurationMinutes;
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

    const cacheKey = CacheKeys.mentorMonthAvailability(mentorUserId, year, month);
    const body = await withJsonCache(cacheKey, CacheTtl.mentorMonthAvailability, async () => {
      const now = new Date();
      const dim = daysInMonth(year, month);
      const availableDays: number[] = [];
      for (let d = 1; d <= dim; d++) {
        const slots = getBookableAvailabilityWindowsForDate(userRow.mentorAvailabilityJson, year, month, d, now, {
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

    const held = await loadMentorHeldSessionIntervals(prisma, mentorUserId);
    const now = new Date();
    const refinedDays: number[] = [];
    for (const d of body.availableDays) {
      const slots = getBookableAvailabilityWindowsForDate(userRow.mentorAvailabilityJson, year, month, d, now, {
        monthlyPatternConsumedThisIstMonth: monthlyConsumed,
      });
      if (filterSlotsAgainstHeldIntervals(slots, sessionMin, held).length > 0) {
        refinedDays.push(d);
      }
    }

    return NextResponse.json(
      {
        ...body,
        availableDays: refinedDays,
      },
      {
        headers: { "Cache-Control": SCHEDULE_API_CACHE_CONTROL },
      },
    );
  } catch (e) {
    console.error("mentor-month-availability GET", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not load month availability." },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
