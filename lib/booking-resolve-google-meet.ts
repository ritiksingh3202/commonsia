import { google } from "googleapis";

import { getGoogleAdminOAuth2Client } from "@/lib/google-calendar-admin-client";
import { getGoogleCalendarOAuth2Client } from "@/lib/google-calendar-oauth-client";
import { meetLinkFromCalendarEventPayload } from "@/lib/google-calendar-meet-link";
import { prisma } from "@/lib/prisma";

/** Coalesce concurrent resolve calls for the same booking (avoids DB pool exhaustion). */
const inflight = new Map<string, Promise<string | null>>();
/** After a resolve attempt finds no link, wait before calling Google Calendar again. */
const lastEmptyResolveAt = new Map<string, number>();
const THROTTLE_MS_AFTER_EMPTY = 45_000;

async function readMeetLinkOnly(bookingId: string): Promise<string | null> {
  const row = await prisma.mentoringBooking.findUnique({
    where: { id: bookingId },
    select: { googleMeetLink: true },
  });
  return row?.googleMeetLink?.trim() ?? null;
}

async function runResolve(bookingId: string): Promise<string | null> {
  const row = await prisma.mentoringBooking.findUnique({
    where: { id: bookingId },
    select: {
      googleMeetLink: true,
      googleEventId: true,
      studentId: true,
      mentorId: true,
    },
  });
  if (!row) return null;
  const cached = row.googleMeetLink?.trim();
  if (cached) return cached;
  const eventId = row.googleEventId?.trim();
  if (!eventId) return null;

  const lastFail = lastEmptyResolveAt.get(bookingId);
  if (lastFail !== undefined && Date.now() - lastFail < THROTTLE_MS_AFTER_EMPTY) {
    return (await readMeetLinkOnly(bookingId)) ?? null;
  }

  /** Booking-request accepts create events on the Commonsia admin calendar first. */
  const admin = getGoogleAdminOAuth2Client();
  if (admin) {
    try {
      const calendar = google.calendar({ version: "v3", auth: admin });
      const res = await calendar.events.get({
        calendarId: "primary",
        eventId,
      });
      const link = res.data ? meetLinkFromCalendarEventPayload(res.data) : null;
      if (link?.trim()) {
        const trimmed = link.trim();
        await prisma.mentoringBooking.update({
          where: { id: bookingId },
          data: { googleMeetLink: trimmed },
        });
        lastEmptyResolveAt.delete(bookingId);
        return trimmed;
      }
    } catch {
      /* Event may not be on admin primary in older flows */
    }
  }

  for (const userId of [row.studentId, row.mentorId]) {
    const oauth2 = await getGoogleCalendarOAuth2Client(userId);
    if (!oauth2) continue;
    try {
      const calendar = google.calendar({ version: "v3", auth: oauth2 });
      const res = await calendar.events.get({
        calendarId: "primary",
        eventId,
      });
      const link = res.data ? meetLinkFromCalendarEventPayload(res.data) : null;
      if (link?.trim()) {
        const trimmed = link.trim();
        await prisma.mentoringBooking.update({
          where: { id: bookingId },
          data: { googleMeetLink: trimmed },
        });
        lastEmptyResolveAt.delete(bookingId);
        return trimmed;
      }
    } catch {
      /* Event may only exist in the other party's calendar */
    }
  }
  lastEmptyResolveAt.set(bookingId, Date.now());
  return null;
}

/**
 * If `googleMeetLink` is empty but `googleEventId` is set, load the event from the
 * student or mentor primary calendar (whoever has OAuth) and persist the Meet URL.
 */
export async function resolveAndPersistMeetLinkForBooking(bookingId: string): Promise<string | null> {
  const existing = inflight.get(bookingId);
  if (existing) return existing;

  const p = runResolve(bookingId).finally(() => {
    inflight.delete(bookingId);
  });
  inflight.set(bookingId, p);
  return p;
}

/** Best-effort: fill `googleMeetLink` on in-memory rows (and DB) for dashboards after admin Calendar creates the Meet. */
export async function enrichMeetLinksOnBookings(
  rows: { id: string; googleMeetLink: string | null; googleEventId: string | null }[],
  limit = 8,
): Promise<void> {
  let n = 0;
  for (const r of rows) {
    if (n >= limit) break;
    if (r.googleMeetLink?.trim()) continue;
    if (!r.googleEventId?.trim()) continue;
    n++;
    const link = await resolveAndPersistMeetLinkForBooking(r.id);
    if (link) r.googleMeetLink = link;
  }
}
