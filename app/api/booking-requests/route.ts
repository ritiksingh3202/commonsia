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
import { getPublicSiteBaseUrl } from "@/lib/public-site-url";
import {
  delKeys,
  mentorMonthAvailabilityKeysAround,
  rememberBookingActionRawToken,
  slotCacheKeysAround,
} from "@/lib/redis-cache";
import { studentProfileLinkForBookingWhatsApp } from "@/lib/booking-student-profile-whatsapp";
import { formatBookingWhatsAppRange } from "@/lib/booking-whatsapp-format";
import { whatsappDigitsFromProfile, zixflowSendTemplate } from "@/lib/zixflow";
import {
  applyZixflowBodyVarOrder,
  ZIXFLOW_DEFAULT_BOOKING_REQUEST_BODY_ORDER,
} from "@/lib/zixflow-template-vars";

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

  const bandStart = new Date(body.startISO);
  const bandEnd = new Date(body.endISO);
  if (Number.isNaN(bandStart.getTime()) || Number.isNaN(bandEnd.getTime()) || bandEnd <= bandStart) {
    return NextResponse.json({ error: "Invalid start or end time." }, { status: 400 });
  }

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
      select: {
        id: true,
        email: true,
        name: true,
        whatsappUrl: true,
        university: true,
        yearOfStudy: true,
        major: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: mentorUserId },
      select: { id: true, role: true, email: true, name: true, whatsappUrl: true, phone: true, mentorAvailabilityJson: true },
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
  /** Book the **first** session-length slice inside the contiguous band the student chose (UI sends band start/end). */
  const sessionEnd = new Date(bandStart.getTime() + sessionMinutes * 60_000);
  if (sessionEnd.getTime() > bandEnd.getTime()) {
    return NextResponse.json(
      {
        error:
          "The mentor’s session length does not fit at the start of this availability window. Pick another row or ask them to widen availability.",
      },
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
    sessionMinutes,
    new Date(),
    slotOpts,
  );
  if (!slotCheck.ok) {
    return NextResponse.json({ error: slotCheck.error }, { status: 400 });
  }

  const start = bandStart;
  const end = sessionEnd;

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
        /** Mirrors Redis `rememberBookingActionRawToken` so quick-reply Accept can sign `/select-slot` without Upstash. */
        actionRawTokenOpaque: rawToken,
        title: body.title?.trim() || null,
        description: body.description?.trim() || null,
      },
      select: { id: true, createdAt: true },
    });
    await rememberBookingActionRawToken(request.id, rawToken);
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

  const base = getPublicSiteBaseUrl();
  const acceptUrl = acceptSigned ? `${base}/api/webhooks/zixflow?token=${encodeURIComponent(acceptSigned)}` : null;
  const rejectUrl = rejectSigned ? `${base}/api/webhooks/zixflow?token=${encodeURIComponent(rejectSigned)}` : null;

  const studentProfile = studentProfileLinkForBookingWhatsApp(base, booker.id);

  void delKeys([
    ...slotCacheKeysAround(mentorRow.id, start),
    ...mentorMonthAvailabilityKeysAround(mentorRow.id, start),
  ]);

  let mentorTo = whatsappDigitsFromProfile({
    whatsappUrl: mentorRow.whatsappUrl,
    phone: mentorRow.phone,
  });
  if (!mentorTo) {
    const fb = process.env.ZIXFLOW_FALLBACK_TO_DIGITS?.trim().replace(/\D/g, "") ?? "";
    if (fb) {
      console.warn(
        "[booking-request] Mentor profile has no WhatsApp URL — sending to ZIXFLOW_FALLBACK_TO_DIGITS (testing only).",
      );
      mentorTo = fb;
    }
  }
  const template = process.env.ZIXFLOW_BOOKING_REQUEST_TEMPLATE?.trim() || "";
  const bodyVarsOrder =
    process.env.ZIXFLOW_BOOKING_BODY_VARS_ORDER?.trim() || ZIXFLOW_DEFAULT_BOOKING_REQUEST_BODY_ORDER;

  const whatsappDiagEnabled =
    process.env.BOOKING_WHATSAPP_DIAGNOSTICS?.trim() === "1" ||
    process.env.BOOKING_WHATSAPP_DIAGNOSTICS?.trim().toLowerCase() === "true";

  /** Only included in JSON when `BOOKING_WHATSAPP_DIAGNOSTICS=true` — no secrets. */
  let whatsapp:
    | { status: "skipped"; reason: string }
    | { status: "sent"; ok: true }
    | { status: "sent"; ok: false; error: string }
    | undefined;

  if (!mentorTo) {
    console.warn(
      "[booking-request] WhatsApp not sent: mentor has no usable WhatsApp number on profile (wa.me / +digits). Set WhatsApp on the mentor profile or ZIXFLOW_FALLBACK_TO_DIGITS for testing.",
    );
    if (whatsappDiagEnabled) whatsapp = { status: "skipped", reason: "no_mentor_whatsapp_digits" };
  } else if (!template) {
    console.warn("[booking-request] WhatsApp not sent: ZIXFLOW_BOOKING_REQUEST_TEMPLATE is empty.");
    if (whatsappDiagEnabled) whatsapp = { status: "skipped", reason: "missing_ZIXFLOW_BOOKING_REQUEST_TEMPLATE" };
  } else if (!acceptUrl || !rejectUrl) {
    console.warn(
      "[booking-request] WhatsApp not sent: BOOKING_ACTION_SECRET is missing — Accept/Reject links cannot be signed.",
    );
    if (whatsappDiagEnabled) whatsapp = { status: "skipped", reason: "missing_BOOKING_ACTION_SECRET" };
  } else {
    /**
     * Await delivery so serverless hosts don’t freeze the invocation before Zixflow’s HTTP request finishes
     * (fire-and-forget `void` sends were often dropped after the JSON response returned).
     */
    try {
      /**
       * WhatsApp template **mentorship_session_booking**: {{1}} mentor … {{6}} requested time (see `lib/zixflow-template-vars.ts`).
       * Accept/Reject URLs must stay signed (`acceptUrl` / `rejectUrl` → `/api/webhooks/zixflow?token=…`).
       */
      let variables = applyZixflowBodyVarOrder(
        {
          /** Maps to Meta {{1}}–{{6}} via `ZIXFLOW_DEFAULT_BOOKING_REQUEST_BODY_ORDER`. */
          mentorName: mentorRow.name ?? "Mentor",
          studentName: booker.name ?? "Student",
          year: booker.yearOfStudy?.trim() || "—",
          college: booker.university?.trim() || booker.major?.trim() || "—",
          studentProfile,
          requestedTime: formatBookingWhatsAppRange(start, end),
          acceptUrl,
          rejectUrl,
          startISO: start.toISOString(),
          endISO: end.toISOString(),
        },
        bodyVarsOrder,
      );
      const acceptBtnVar = process.env.ZIXFLOW_BOOKING_ACCEPT_URL_TEMPLATE_VAR?.trim();
      const rejectBtnVar = process.env.ZIXFLOW_BOOKING_REJECT_URL_TEMPLATE_VAR?.trim();
      /**
       * WhatsApp URL buttons have static prefixes like `https://commonsia.com/api/booking/accept?bookingId=`
       * with `{{1}}` as the dynamic suffix. Pass just the bookingRequestId so the final URL becomes
       * `…/api/booking/accept?bookingId={request.id}`.
       */
      if (acceptBtnVar) variables = { ...variables, [acceptBtnVar]: request.id };
      if (rejectBtnVar) variables = { ...variables, [rejectBtnVar]: request.id };

      const send = await zixflowSendTemplate({
        to: mentorTo,
        template,
        variables,
      });
      if (!send.ok) {
        console.error("[booking-request] Zixflow booking request send failed:", send.error);
        if (whatsappDiagEnabled) whatsapp = { status: "sent", ok: false, error: send.error };
      } else {
        console.info("[booking-request] Zixflow booking request: API accepted send (check mentor handset / Zixflow dashboard if not delivered).");
        if (whatsappDiagEnabled) {
          whatsapp = { status: "sent", ok: true };
        }
      }
    } catch (e) {
      console.error("[booking-request] Zixflow booking request send threw:", e);
      if (whatsappDiagEnabled) {
        whatsapp = {
          status: "sent",
          ok: false,
          error: e instanceof Error ? e.message : "unknown_error",
        };
      }
    }
  }

  return NextResponse.json({
    ok: true,
    bookingRequestId: request.id,
    message:
      "Request received. We’ll email you when the mentor accepts or declines. Other students won’t see this session start while it’s pending.",
    ...(whatsappDiagEnabled && whatsapp ? { whatsapp } : {}),
  });
}

export const runtime = "nodejs";

