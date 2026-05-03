import { randomUUID } from "crypto";

import type { calendar_v3 } from "googleapis";
import { google } from "googleapis";

import { getGoogleAdminCalendarId, getGoogleAdminOAuth2Client } from "@/lib/google-calendar-admin-client";
import { getGoogleCalendarOAuth2Client } from "@/lib/google-calendar-oauth-client";
import { meetLinkFromCalendarEventPayload } from "@/lib/google-calendar-meet-link";
import { defaultCalendarTimeZone } from "@/lib/schedule-slot-ist";

const TZ = defaultCalendarTimeZone();

export type SessionParticipant = {
  id: string;
  email: string | null;
  name: string | null;
};

/**
 * Creates a Google Calendar event with Meet for a student–mentor session (used by booking
 * requests and direct booking). Tries student OAuth → mentor OAuth → Commonsia admin calendar.
 */
export async function createGoogleMentorSessionEvent(opts: {
  student: SessionParticipant;
  mentor: SessionParticipant;
  start: Date;
  end: Date;
  title: string;
  description: string;
}): Promise<{
  calendarEvent: calendar_v3.Schema$Event | null;
  meetLink: string | null;
  organizer: "student" | "mentor" | "admin" | null;
}> {
  const { student, mentor, start, end, title, description } = opts;

  const reminders = {
    useDefault: false,
    overrides: [
      { method: "popup" as const, minutes: 10 },
    ],
  };

  const sendUpdates = "all" as const;

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
          summary: title,
          description,
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
      console.error("[calendar] mentor-session events.insert (user) failed:", e);
      return null;
    }
  }

  async function insertForAdmin(attendees: { email: string; displayName?: string }[]) {
    const admin = getGoogleAdminOAuth2Client();
    if (!admin || attendees.length === 0) return null;
    try {
      const calendar = google.calendar({ version: "v3", auth: admin });
      const res = await calendar.events.insert({
        calendarId: getGoogleAdminCalendarId(),
        conferenceDataVersion: 1,
        sendUpdates,
        requestBody: {
          summary: title,
          description,
          start: { dateTime: start.toISOString(), timeZone: TZ },
          end: { dateTime: end.toISOString(), timeZone: TZ },
          reminders,
          attendees,
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
      console.error("[calendar] mentor-session events.insert (admin) failed:", e);
      return null;
    }
  }

  let calendarEvent: calendar_v3.Schema$Event | null = null;
  let organizer: "student" | "mentor" | "admin" | null = null;

  const studentEmail = student.email?.trim();
  const mentorEmail = mentor.email?.trim();

  const mentorAttendees =
    mentorEmail && studentEmail && mentorEmail.toLowerCase() !== studentEmail.toLowerCase()
      ? [{ email: mentorEmail, displayName: mentor.name ?? undefined }]
      : [];

  if (studentEmail) {
    calendarEvent = await insertForOrganizer(student.id, mentorAttendees);
    if (calendarEvent) organizer = "student";
  }

  if (!calendarEvent && studentEmail) {
    calendarEvent = await insertForOrganizer(mentor.id, [
      { email: studentEmail, displayName: student.name ?? undefined },
    ]);
    if (calendarEvent) organizer = "mentor";
  }

  if (!calendarEvent) {
    const attendees: { email: string; displayName?: string }[] = [];
    if (studentEmail) attendees.push({ email: studentEmail, displayName: student.name ?? undefined });
    if (
      mentorEmail &&
      (!studentEmail || mentorEmail.toLowerCase() !== studentEmail.toLowerCase())
    ) {
      attendees.push({ email: mentorEmail, displayName: mentor.name ?? undefined });
    }
    calendarEvent = await insertForAdmin(attendees);
    if (calendarEvent) organizer = "admin";
  }

  const meetLink = calendarEvent ? meetLinkFromCalendarEventPayload(calendarEvent) : null;

  return { calendarEvent, meetLink, organizer };
}
