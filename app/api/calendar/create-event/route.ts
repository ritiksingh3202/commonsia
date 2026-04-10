import { google } from "googleapis";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { defaultCalendarTimeZone } from "@/lib/schedule-slot-ist";
import { getGoogleCalendarOAuth2Client } from "@/lib/google-calendar-oauth-client";
import { createMentoringBookingRow } from "@/lib/mentoring-booking-access";
import { prisma } from "@/lib/prisma";

const TZ = defaultCalendarTimeZone();

type Body = {
  mentorUserId?: string;
  startISO: string;
  endISO: string;
  title?: string;
  description?: string;
  /** When true, Google emails attendees and sends reminders per event overrides. */
  notifyAttendees?: boolean;
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

  const { mentorUserId, startISO, endISO, title, description, notifyAttendees = true } = body;
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
      select: { id: true, role: true, email: true, name: true },
    });
    if (!m || m.role !== "mentor") {
      return NextResponse.json({ error: "Mentor not found." }, { status: 404 });
    }
    mentor = m;
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

  const sendUpdates = notifyAttendees ? ("all" as const) : ("none" as const);

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
        sendUpdates,
        requestBody: {
          summary: eventTitle,
          description: eventDescription,
          start: { dateTime: start.toISOString(), timeZone: TZ },
          end: { dateTime: end.toISOString(), timeZone: TZ },
          reminders,
          attendees: attendees.length ? attendees : undefined,
        },
      });
      return res.data;
    } catch {
      return null;
    }
  }

  let calendarEvent: unknown = null;
  let organizer: "mentor" | "student" | null = null;

  if (mentor) {
    calendarEvent = await insertForOrganizer(mentor.id, [
      { email: booker.email, displayName: booker.name ?? undefined },
    ]);
    if (calendarEvent) organizer = "mentor";

    if (!calendarEvent) {
      const mentorAttendees = mentor.email
        ? [{ email: mentor.email, displayName: mentor.name ?? undefined }]
        : [];
      calendarEvent = await insertForOrganizer(booker.id, mentorAttendees);
      if (calendarEvent) organizer = "student";
    }
  } else {
    calendarEvent = await insertForOrganizer(booker.id, []);
    if (calendarEvent) organizer = "student";
  }

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
      });
    } catch (e) {
      console.error("createMentoringBookingRow", e);
    }
  }

  if (!calendarEvent) {
    return NextResponse.json({
      ok: true,
      calendarSynced: false,
      bookingSaved: mentor != null,
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
  });
}

export const runtime = "nodejs";
