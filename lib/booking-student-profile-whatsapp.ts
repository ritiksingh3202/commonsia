/**
 * WhatsApp template {{5}} — link to the student’s Commonsia profile as seen by mentors (not portfolio URL).
 */
export function studentProfileLinkForBookingWhatsApp(siteBaseUrl: string, studentId: string): string {
  const base = siteBaseUrl.replace(/\/$/, "");
  const path = `/mentor/students/${studentId}`;
  return `${base}${path}`;
}
