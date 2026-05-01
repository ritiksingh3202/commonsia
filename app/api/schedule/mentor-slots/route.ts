import { NextResponse } from "next/server";

import { normalizeAvailabilityWindowKind } from "@/components/mentor/mentor-setup-constants";
import { calendarDateToIso, getBookableAvailabilityWindowsForDate } from "@/lib/booking-availability-slots";
import { mergeAvailabilityForSlot } from "@/lib/mentor-availability-merge";
import { jsWeekdayFromIsoLocal } from "@/lib/mentor-availability-slots";
import { filterSlotsAgainstHeldIntervals, loadMentorHeldIntervals } from "@/lib/mentor-held-booking-slots";
import { mentorHasBookingOnWeekdayInIstMonth } from "@/lib/mentor-monthly-booking";
import { prisma } from "@/lib/prisma";
import { CacheKeys, CacheTtl, SCHEDULE_API_CACHE_CONTROL, withJsonCache } from "@/lib/redis-cache";

/**
 * Bookable **contiguous availability windows** for a civil calendar day (IST half-hour grid).
 * Slots already held by another student's pending/accepted request or a confirmed booking are removed.
 */
export async function GET(req: Request) {
  try {
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

    const userRow = await prisma.user.findUnique({
      where: { id: mentorUserId },
      select: { role: true, mentorAvailabilityJson: true },
    });
    if (!userRow || userRow.role !== "mentor") {
      return NextResponse.json({ error: "Mentor not found." }, { status: 404 });
    }

    const avMerged = mergeAvailabilityForSlot(userRow.mentorAvailabilityJson);
    const sessionMin = avMerged.sessionDurationMinutes;

    const cacheKey = CacheKeys.mentorSlots(mentorUserId, year, month, day);
    const body = await withJsonCache(cacheKey, CacheTtl.mentorSlots, async () => {
      const now = new Date();
      const av = avMerged;
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
      const slots = getBookableAvailabilityWindowsForDate(userRow.mentorAvailabilityJson, year, month, day, now, {
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

    const held = await loadMentorHeldIntervals(prisma, mentorUserId);
    const slots = filterSlotsAgainstHeldIntervals(body.slots, sessionMin, held);

    return NextResponse.json(
      {
        ...body,
        slots,
        slotRanges: slots.map((s) => s.rangeLabelIst),
      },
      {
        headers: { "Cache-Control": SCHEDULE_API_CACHE_CONTROL },
      },
    );
  } catch (e) {
    console.error("mentor-slots GET", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not load mentor slots." },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
