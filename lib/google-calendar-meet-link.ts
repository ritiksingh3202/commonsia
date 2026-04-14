/** Extract Meet / Hangouts video URL from Calendar API event payload. */
export function meetLinkFromCalendarEventPayload(ev: {
  hangoutLink?: string | null;
  conferenceData?: {
    entryPoints?: { entryPointType?: string | null; uri?: string | null }[] | null;
  } | null;
}): string | null {
  if (ev.hangoutLink) return ev.hangoutLink;
  const video = ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video");
  return video?.uri ?? null;
}
