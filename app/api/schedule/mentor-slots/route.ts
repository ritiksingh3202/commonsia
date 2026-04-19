import { NextResponse } from "next/server";

import { normalizeAvailabilityWindowKind } from "@/components/mentor/mentor-setup-constants";
import { calendarDateToIso, getBookableSlotSegmentsForDate } from "@/lib/booking-availability-slots";
import { mergeAvailabilityForSlot } from "@/lib/mentor-availability-merge";
import { jsWeekdayFromIsoLocal } from "@/lib/mentor-availability-slots";
import { mentorHasBookingOnWeekdayInIstMonth } from "@/lib/mentor-monthly-booking";
import { prisma } from "@/lib/prisma";
import { CacheKeys, CacheTtl, SCHEDULE_API_CACHE_CONTROL, withJsonCache } from "@/lib/redis-cache";

/**
 * Bookable 30-minute segments for a civil calendar day (slots stored in IST in mentor settings).
 * Redis: read-through cache includes Prisma availability resolution.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mentorUserId = url.searchParams.get("mentorUserId")?.trim();
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));
  const day = Number(url.searchParams.get("day"));

  if (!mentorUserId || !Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return NextResponse.json({ error: "mentorUserId, year, month, and day are required." }, { status: 400 });
  }
  if (month < 0 || month > 11 || day < 1 || day > 31) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const cacheKey = CacheKeys.mentorSlots(mentorUserId, year, month, day);
  const body = await withJsonCache(cacheKey, CacheTtl.mentorSlots, async () => {
    const user = await prisma.user.findUnique({
      where: { id: mentorUserId },
      select: { role: true, mentorAvailabilityJson: true },
    });

    if (!user || user.role !== "mentor") {
      return null;
    }

    const now = new Date();
    const av = mergeAvailabilityForSlot(user.mentorAvailabilityJson);
    const iso = calendarDateToIso(year, month, day);
    let monthlyConsumed = false;
    if (
      normalizeAvailabilityWindowKind(av.availabilityWindowKind) === "monthly" &&
      typeof av.recurringWeekdayJs === "number" &&
      jsWeekdayFromIsoLocal(iso) === av.recurringWeekdayJs
    ) {
      monthlyConsumed = await mentorHasBookingOnWeekdayInIstMonth(
        mentorUserId,
        year,
        month,
        av.recurringWeekdayJs,
      );
    }
    const slots = getBookableSlotSegmentsForDate(user.mentorAvailabilityJson, year, month, day, now, {
      monthlyPatternConsumedThisIstMonth: monthlyConsumed,
    });

    return {
      ok: true as const,
      slots,
      /** @deprecated use `slots` */
      slotRanges: slots.map((s) => s.rangeLabelIst),
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
