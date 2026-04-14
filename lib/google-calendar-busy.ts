import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

export type BusyInterval = { start: Date; end: Date };

export async function fetchPrimaryCalendarBusy(
  oauth2: OAuth2Client,
  timeMin: Date,
  timeMax: Date,
): Promise<BusyInterval[]> {
  const calendar = google.calendar({ version: "v3", auth: oauth2 });
  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: "primary" }],
    },
  });
  const busy = res.data.calendars?.primary?.busy ?? [];
  return busy
    .filter((b): b is { start?: string; end?: string } => Boolean(b?.start && b.end))
    .map((b) => ({ start: new Date(b.start!), end: new Date(b.end!) }));
}

export function intervalOverlapsBusy(start: Date, end: Date, busy: BusyInterval[]): boolean {
  return busy.some((b) => start < b.end && end > b.start);
}
