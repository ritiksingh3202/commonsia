import { NextResponse } from "next/server";

import {
  calendarDateToIso,
  getBookableSlotSegmentsForDate,
} from "@/lib/booking-availability-slots";
import { fetchPrimaryCalendarBusy, intervalOverlapsBusy } from "@/lib/google-calendar-busy";
import { getGoogleCalendarOAuth2Client } from "@/lib/google-calendar-oauth-client";
import { prisma } from "@/lib/prisma";
import { CacheKeys, CacheTtl, withJsonCache } from "@/lib/redis-cache";

/**
 * Bookable 30-minute segments for a civil calendar day (slots stored in IST in mentor settings).
 * When the mentor has Google Calendar connected, busy times on their primary calendar are removed.
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

  const user = await prisma.user.findUnique({
    where: { id: mentorUserId },
    select: { role: true, mentorAvailabilityJson: true },
  });

  if (!user || user.role !== "mentor") {
    return NextResponse.json({ error: "Mentor not found." }, { status: 404 });
  }

  const cacheKey = CacheKeys.mentorSlots(mentorUserId, year, month, day);
  const body = await withJsonCache(cacheKey, CacheTtl.mentorSlots, async () => {
    const now = new Date();
    let slots = getBookableSlotSegmentsForDate(user.mentorAvailabilityJson, year, month, day, now);

    const oauth2 = await getGoogleCalendarOAuth2Client(mentorUserId);
    if (oauth2 && slots.length > 0) {
      const iso = calendarDateToIso(year, month, day);
      const timeMin = new Date(`${iso}T00:00:00+05:30`);
      const timeMax = new Date(`${iso}T23:59:59.999+05:30`);
      try {
        const busy = await fetchPrimaryCalendarBusy(oauth2, timeMin, timeMax);
        slots = slots.filter(
          (s) => !intervalOverlapsBusy(new Date(s.startISO), new Date(s.endISO), busy),
        );
      } catch (e) {
        console.error("Google Calendar freebusy.query failed:", e);
      }
    }

    return {
      ok: true as const,
      slots,
      /** @deprecated use `slots` */
      slotRanges: slots.map((s) => s.rangeLabelIst),
      fetchedAt: now.toISOString(),
    };
  });

  return NextResponse.json(body);
}

export const runtime = "nodejs";
