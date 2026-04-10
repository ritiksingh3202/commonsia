import { google } from "googleapis";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { MentorAvailabilityJson } from "@/components/mentor/mentor-setup-constants";
import { getGoogleCalendarOAuth2Client } from "@/lib/google-calendar-oauth-client";
import { buildAvailabilityCalendarEvents } from "@/lib/mentor-calendar-sync";
import { prisma } from "@/lib/prisma";

const TZ = process.env.DEFAULT_CALENDAR_TIMEZONE ?? "Asia/Kolkata";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mentorAvailabilityJson: true },
  });

  const raw = user?.mentorAvailabilityJson;
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "No saved availability." }, { status: 400 });
  }

  const av = raw as unknown as MentorAvailabilityJson;
  const events = buildAvailabilityCalendarEvents(av);
  if (events.length === 0) {
    return NextResponse.json({ error: "No time slots to sync." }, { status: 400 });
  }

  const oauth2Client = await getGoogleCalendarOAuth2Client(session.user.id);
  if (!oauth2Client) {
    return NextResponse.json({ error: "Connect Google Calendar first." }, { status: 400 });
  }

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  let created = 0;
  for (const ev of events) {
    await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: ev.summary,
        start: {
          dateTime: ev.start.toISOString(),
          timeZone: TZ,
        },
        end: {
          dateTime: ev.end.toISOString(),
          timeZone: TZ,
        },
      },
    });
    created++;
  }

  return NextResponse.json({ ok: true, created });
}
