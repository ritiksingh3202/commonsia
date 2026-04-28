import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { normalizeAvailabilityWindowKind } from "@/components/mentor/mentor-setup-constants";
import { calendarDateToIso, validateBookingInAvailability } from "@/lib/booking-availability-slots";
import { newRawBookingActionToken, sha256Hex, signBookingAction } from "@/lib/booking-action-token";
import { fetchPrimaryCalendarBusy, intervalOverlapsBusy } from "@/lib/google-calendar-busy";
import { getGoogleCalendarOAuth2Client } from "@/lib/google-calendar-oauth-client";
import { mergeAvailabilityForSlot } from "@/lib/mentor-availability-merge";
import { jsWeekdayFromIsoLocal } from "@/lib/mentor-availability-slots";
import { mentorHasBookingOnWeekdayInIstMonth } from "@/lib/mentor-monthly-booking";
import { prisma } from "@/lib/prisma";
import { delKeys, mentorMonthAvailabilityKeysAround, slotCacheKeysAround } from "@/lib/redis-cache";
import { whatsappNumberFromUrl, zixflowSendTemplate } from "@/lib/zixflow";

type Body = {
  mentorUserId?: string;
  startISO: string;
  endISO: string;
  bookYear?: number;
  bookMonthIndex?: number;
  bookDay?: number;
  startLabel?: string;
  title?: string;
  description?: string;
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to request a booking." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mentorUserId = body.mentorUserId?.trim();
  if (!mentorUserId) {
    return NextResponse.json({ error: "mentorUserId is required." }, { status: 400 });
  }

  const start = new Date(body.startISO);
  const end = new Date(body.endISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: "Invalid start or end time." }, { status: 400 });
  }
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60_000);

  if (
    typeof body.bookYear !== "number" ||
    typeof body.bookMonthIndex !== "number" ||
    typeof body.bookDay !== "number" ||
    typeof body.startLabel !== "string" ||
    !body.startLabel.trim()
  ) {
    return NextResponse.json(
      { error: "Include bookYear, bookMonthIndex, bookDay, and startLabel for mentor bookings." },
      { status: 400 },
    );
  }

  const [booker, mentorRow] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, whatsappUrl: true },
    }),
    prisma.user.findUnique({
      where: { id: mentorUserId },
      select: { id: true, role: true, email: true, name: true, whatsappUrl: true, mentorAvailabilityJson: true },
    }),
  ]);

  if (!booker?.email) {
    return NextResponse.json({ error: "Your profile needs an email address." }, { status: 400 });
  }
  if (!mentorRow || mentorRow.role !== "mentor") {
    return NextResponse.json({ error: "Mentor not found." }, { status: 404 });
  }

  const av = mergeAvailabilityForSlot(mentorRow.mentorAvailabilityJson);
  const sessionMinutes = av.sessionDurationMinutes;
  if (durationMin !== sessionMinutes) {
    return NextResponse.json(
      { error: `Session length must match this mentor's setting (${sessionMinutes} minutes).` },
      { status: 400 },
    );
  }

  const bookIso = calendarDateToIso(body.bookYear, body.bookMonthIndex, body.bookDay);
  let slotOpts: { monthlyPatternConsumedThisIstMonth?: boolean } | undefined;
  if (
    normalizeAvailabilityWindowKind(av.availabilityWindowKind) === "monthly" &&
    typeof av.recurringWeekdayJs === "number" &&
    jsWeekdayFromIsoLocal(bookIso) === av.recurringWeekdayJs
  ) {
    const consumed = await mentorHasBookingOnWeekdayInIstMonth(
      mentorRow.id,
      body.bookYear,
      body.bookMonthIndex,
      av.recurringWeekdayJs,
    );
    slotOpts = { monthlyPatternConsumedThisIstMonth: consumed };
  }
  const slotCheck = validateBookingInAvailability(
    mentorRow.mentorAvailabilityJson,
    body.bookYear,
    body.bookMonthIndex,
    body.bookDay,
    body.startLabel.trim(),
    durationMin,
    new Date(),
    slotOpts,
  );
  if (!slotCheck.ok) {
    return NextResponse.json({ error: slotCheck.error }, { status: 400 });
  }

  // Best-effort Google busy check — short timeout so the student request stays snappy.
  const mentorOauth = await getGoogleCalendarOAuth2Client(mentorRow.id);
  if (mentorOauth) {
    try {
      const padMin = new Date(start.getTime() - 120_000);
      const padMax = new Date(end.getTime() + 120_000);
      const busyPromise = fetchPrimaryCalendarBusy(mentorOauth, padMin, padMax);
      const busy = await Promise.race([
        busyPromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("freebusy-timeout")), 1800)),
      ]).catch(() => null);
      if (busy && intervalOverlapsBusy(start, end, busy)) {
        return NextResponse.json(
          { error: "That time is no longer open on this mentor's Google Calendar. Pick another slot." },
          { status: 409 },
        );
      }
    } catch (e) {
      if ((e as Error)?.message !== "freebusy-timeout") {
        console.error("freebusy before booking request:", e);
      }
    }
  }

  const rawToken = newRawBookingActionToken();
  const actionTokenHash = sha256Hex(rawToken);

  let request: { id: string; createdAt: Date };
  try {
    request = await prisma.bookingRequest.create({
      data: {
        studentId: booker.id,
        mentorId: mentorRow.id,
        startAt: start,
        endAt: end,
        actionTokenHash,
        title: body.title?.trim() || null,
        description: body.description?.trim() || null,
      },
      select: { id: true, createdAt: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "A request for this exact time already exists. Pick another slot or check your pending requests." },
        { status: 409 },
      );
    }
    throw e;
  }

  const acceptSigned = signBookingAction({ bookingRequestId: request.id, action: "accept", rawToken });
  const rejectSigned = signBookingAction({ bookingRequestId: request.id, action: "reject", rawToken });

  const base = (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const acceptUrl = acceptSigned ? `${base}/api/webhooks/zixflow?token=${encodeURIComponent(acceptSigned)}` : null;
  const rejectUrl = rejectSigned ? `${base}/api/webhooks/zixflow?token=${encodeURIComponent(rejectSigned)}` : null;

  void delKeys([
    ...slotCacheKeysAround(mentorRow.id, start),
    ...mentorMonthAvailabilityKeysAround(mentorRow.id, start),
  ]);

  const mentorTo = whatsappNumberFromUrl(mentorRow.whatsappUrl);
  const template = process.env.ZIXFLOW_BOOKING_REQUEST_TEMPLATE?.trim() || "";
  if (mentorTo && template && acceptUrl && rejectUrl) {
    void zixflowSendTemplate({
      to: mentorTo,
      template,
      variables: {
        mentorName: mentorRow.name ?? "Mentor",
        studentName: booker.name ?? "Student",
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        acceptUrl,
        rejectUrl,
      },
    }).then((send) => {
      if (!send.ok) console.error("Zixflow booking request send failed:", send.error);
    });
  } else {
    console.info("[booking-request] WhatsApp not sent (missing mentor WhatsApp, template, or action secret).");
  }

  return NextResponse.json({
    ok: true,
    bookingRequestId: request.id,
    message:
      "Request received. We’ll email you when the mentor accepts or declines. Other students won’t see this time while it’s pending.",
  });
}

export const runtime = "nodejs";

