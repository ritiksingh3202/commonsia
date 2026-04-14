import { randomUUID } from "crypto";

import { google } from "googleapis";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { validateBookingInAvailability } from "@/lib/booking-availability-slots";
import { fetchPrimaryCalendarBusy, intervalOverlapsBusy } from "@/lib/google-calendar-busy";
import { defaultCalendarTimeZone } from "@/lib/schedule-slot-ist";
import { getGoogleCalendarOAuth2Client } from "@/lib/google-calendar-oauth-client";
import { sendBookingConfirmationEmails } from "@/lib/booking-emails";
import { createMentoringBookingRow } from "@/lib/mentoring-booking-access";
import { prisma } from "@/lib/prisma";

const TZ = defaultCalendarTimeZone();

type Body = {
  mentorUserId?: string;
  startISO: string;
  endISO: string;
  /** IST calendar day + slot label — required with mentorUserId so we only book inside saved availability. */
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
    return NextResponse.json({ error: "Sign in to book a session and sync your calendar." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    mentorUserId,
    startISO,
    endISO,
    bookYear,
    bookMonthIndex,
    bookDay,
    startLabel,
    title,
    description,
  } = body;
  if (!startISO || !endISO) {
    return NextResponse.json({ error: "startISO and endISO are required." }, { status: 400 });
  }

  const start = new Date(startISO);
  const end = new Date(endISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: "Invalid start or end time." }, { status: 400 });
  }

  const booker = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true },
  });
  if (!booker?.email) {
    return NextResponse.json(
      { error: "Your profile needs an email address to send calendar invites." },
      { status: 400 },
    );
  }

  let mentor: { id: string; email: string | null; name: string | null } | null = null;
  if (mentorUserId?.trim()) {
    const m = await prisma.user.findUnique({
      where: { id: mentorUserId.trim() },
      select: { id: true, role: true, email: true, name: true, mentorAvailabilityJson: true },
    });
    if (!m || m.role !== "mentor") {
      return NextResponse.json({ error: "Mentor not found." }, { status: 404 });
    }
    mentor = { id: m.id, email: m.email, name: m.name };

    const durationMin = Math.round((end.getTime() - start.getTime()) / 60_000);
    if (
      typeof bookYear !== "number" ||
      typeof bookMonthIndex !== "number" ||
      typeof bookDay !== "number" ||
      typeof startLabel !== "string" ||
      !startLabel.trim()
    ) {
      return NextResponse.json(
        { error: "Include bookYear, bookMonthIndex, bookDay, and startLabel for mentor bookings." },
        { status: 400 },
      );
    }
    const slotCheck = validateBookingInAvailability(
      m.mentorAvailabilityJson,
      bookYear,
      bookMonthIndex,
      bookDay,
      startLabel.trim(),
      durationMin,
      new Date(),
    );
    if (!slotCheck.ok) {
      return NextResponse.json({ error: slotCheck.error }, { status: 400 });
    }

    const oauthBusy = await getGoogleCalendarOAuth2Client(m.id);
    if (oauthBusy) {
      try {
        const padMin = new Date(start.getTime() - 120_000);
        const padMax = new Date(end.getTime() + 120_000);
        const busy = await fetchPrimaryCalendarBusy(oauthBusy, padMin, padMax);
        if (intervalOverlapsBusy(start, end, busy)) {
          return NextResponse.json(
            {
              error:
                "That time is no longer open on this mentor's Google Calendar. Refresh times and pick another slot.",
            },
            { status: 409 },
          );
        }
      } catch (e) {
        console.error("freebusy before booking:", e);
      }
    }
  }

  const eventTitle =
    title?.trim() ||
    (mentor?.name ? `Commonsia: Session with ${mentor.name}` : "Commonsia mentoring session");
  const eventDescription =
    description?.trim() ||
    [
      "Scheduled via Commonsia.",
      mentor?.name ? `Mentor: ${mentor.name}` : null,
      booker.name ? `Student: ${booker.name}` : null,
    ]
      .filter(Boolean)
      .join("\n");

  const reminders = {
    useDefault: false,
    overrides: [
      { method: "popup" as const, minutes: 10 },
      { method: "email" as const, minutes: 30 },
    ],
  };

  /** Invites and reminders are always sent when Google accepts attendees (product policy). */
  const sendUpdates = "all" as const;

  function meetLinkFromCalendarEvent(ev: {
    hangoutLink?: string | null;
    conferenceData?: {
      entryPoints?: { entryPointType?: string | null; uri?: string | null }[] | null;
    } | null;
  }): string | null {
    if (ev.hangoutLink) return ev.hangoutLink;
    const video = ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video");
    return video?.uri ?? null;
  }

  async function insertForOrganizer(
    organizerUserId: string,
    attendees: { email: string; displayName?: string }[],
  ) {
    try {
      const oauth2 = await getGoogleCalendarOAuth2Client(organizerUserId);
      if (!oauth2) return null;
      const calendar = google.calendar({ version: "v3", auth: oauth2 });
      const res = await calendar.events.insert({
        calendarId: "primary",
        conferenceDataVersion: 1,
        sendUpdates,
        requestBody: {
          summary: eventTitle,
          description: eventDescription,
          start: { dateTime: start.toISOString(), timeZone: TZ },
          end: { dateTime: end.toISOString(), timeZone: TZ },
          reminders,
          attendees: attendees.length ? attendees : undefined,
          conferenceData: {
            createRequest: {
              requestId: randomUUID(),
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        },
      });
      return res.data ?? null;
    } catch (e) {
      console.error("Google Calendar events.insert failed:", e);
      return null;
    }
  }

  let calendarEvent: unknown = null;
  let organizer: "mentor" | "student" | null = null;

  if (mentor) {
    const mentorAttendees =
      mentor.email && mentor.email.toLowerCase() !== booker.email.toLowerCase()
        ? [{ email: mentor.email, displayName: mentor.name ?? undefined }]
        : [];

    // Prefer the student as Google Calendar organizer first so the mentor is a guest and receives
    // Google's calendar invitation email (when the student has Calendar connected).
    calendarEvent = await insertForOrganizer(booker.id, mentorAttendees);
    if (calendarEvent) organizer = "student";

    if (!calendarEvent) {
      calendarEvent = await insertForOrganizer(mentor.id, [
        { email: booker.email, displayName: booker.name ?? undefined },
      ]);
      if (calendarEvent) organizer = "mentor";
    }
  } else {
    calendarEvent = await insertForOrganizer(booker.id, []);
    if (calendarEvent) organizer = "student";
  }

  const meetLink = calendarEvent ? meetLinkFromCalendarEvent(calendarEvent) : null;

  if (mentor) {
    try {
      await createMentoringBookingRow({
        prisma,
        studentId: booker.id,
        mentorId: mentor.id,
        startAt: start,
        endAt: end,
        title: eventTitle,
        googleEventId: calendarEvent ? ((calendarEvent as { id?: string }).id ?? null) : null,
        googleMeetLink: meetLink,
      });
    } catch (e) {
      console.error("createMentoringBookingRow", e);
    }

    void sendBookingConfirmationEmails({
      studentEmail: booker.email,
      studentName: booker.name,
      mentorEmail: mentor.email,
      mentorName: mentor.name,
      start,
      end,
      meetLink,
      calendarSynced: calendarEvent != null,
    });
  }

  if (!calendarEvent) {
    return NextResponse.json({
      ok: true,
      calendarSynced: false,
      bookingSaved: mentor != null,
      meetLink: null,
      message:
        mentor != null
          ? "Session saved. Connect Google Calendar (mentor dashboard or your student dashboard) to add it to Calendar and email invites."
          : "Connect Google Calendar to add this block to your calendar.",
    });
  }

  return NextResponse.json({
    ok: true,
    calendarSynced: true,
    bookingSaved: mentor != null,
    organizer,
    eventId: (calendarEvent as { id?: string }).id,
    htmlLink: (calendarEvent as { htmlLink?: string }).htmlLink,
    meetLink,
  });
}

export const runtime = "nodejs";
