import { google } from "googleapis";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { MentorAvailabilityJson } from "@/components/mentor/mentor-setup-constants";
import { getGoogleCalendarRefreshToken } from "@/lib/google-calendar-db";
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

  const refreshToken = await getGoogleCalendarRefreshToken(session.user.id);
  if (!refreshToken) {
    return NextResponse.json({ error: "Connect Google Calendar first." }, { status: 400 });
  }

  const raw = user?.mentorAvailabilityJson;
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "No saved availability." }, { status: 400 });
  }

  const av = raw as unknown as MentorAvailabilityJson;
  const events = buildAvailabilityCalendarEvents(av);
  if (events.length === 0) {
    return NextResponse.json({ error: "No time slots to sync." }, { status: 400 });
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const redirectUri = `${base.replace(/\/$/, "")}/api/calendar/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

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
