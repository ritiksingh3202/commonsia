import { NextResponse } from "next/server";

import { calendarDateToIso, getBookableSlotSegmentsForDate } from "@/lib/booking-availability-slots";
import { fetchPrimaryCalendarBusy, intervalOverlapsBusy } from "@/lib/google-calendar-busy";
import { getGoogleCalendarOAuth2Client } from "@/lib/google-calendar-oauth-client";
import { prisma } from "@/lib/prisma";

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Returns which days in a month have at least one bookable 30-min segment.
 * Used to disable/fade unavailable dates in the booking calendar (Calendly-like UX).
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

  const user = await prisma.user.findUnique({
    where: { id: mentorUserId },
    select: { role: true, mentorAvailabilityJson: true },
  });

  if (!user || user.role !== "mentor") {
    return NextResponse.json({ error: "Mentor not found." }, { status: 404 });
  }

  const now = new Date();
  const dim = daysInMonth(year, month);

  const oauth2 = await getGoogleCalendarOAuth2Client(mentorUserId);
  let busy: { start: Date; end: Date }[] | null = null;
  if (oauth2) {
    const isoStart = calendarDateToIso(year, month, 1);
    const isoEnd = calendarDateToIso(year, month, dim);
    const timeMin = new Date(`${isoStart}T00:00:00+05:30`);
    const timeMax = new Date(`${isoEnd}T23:59:59.999+05:30`);
    try {
      busy = await fetchPrimaryCalendarBusy(oauth2, timeMin, timeMax);
    } catch (e) {
      console.error("Google Calendar freebusy.query failed (month):", e);
      busy = null;
    }
  }

  const availableDays: number[] = [];
  for (let day = 1; day <= dim; day++) {
    let slots = getBookableSlotSegmentsForDate(user.mentorAvailabilityJson, year, month, day, now);
    if (busy && slots.length > 0) {
      slots = slots.filter((s) => !intervalOverlapsBusy(new Date(s.startISO), new Date(s.endISO), busy!));
    }
    if (slots.length > 0) availableDays.push(day);
  }

  return NextResponse.json({
    ok: true,
    availableDays,
    fetchedAt: now.toISOString(),
  });
}

export const runtime = "nodejs";

