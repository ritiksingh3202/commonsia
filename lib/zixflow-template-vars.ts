/**
 * Logical keys → Zixflow `body_1`, `body_2`, … order defaults.
 *
 * **Template A — mentorship session request** (screenshot: hello {{1}}, … {{6}} requested time):
 * | Meta `{{n}}` | Key             | DB / source                                        |
 * |-------------|-----------------|---------------------------------------------------|
 * | {{1}}       | mentorName      | `User.name` (mentor)                              |
 * | {{2}}       | studentName     | `User.name` (student)                             |
 * | {{3}}       | college         | `User.university`, fallback `User.major`          |
 * | {{4}}       | year            | `User.yearOfStudy`                                |
 * | {{5}}       | studentProfile  | `{AUTH_URL}/mentor/students/{studentId}`          |
 * | {{6}}       | requestedTime   | Human range from booking `startAt`/`endAt` (IST) |
 *
 * **Clickable Accept/Reject links:** Plain URLs in the template *body* are often not tappable in WhatsApp.
 * Add Meta **URL** (call-to-action) buttons and map dynamic URLs via Zixflow variable keys:
 * - `ZIXFLOW_BOOKING_ACCEPT_URL_TEMPLATE_VAR` — duplicate full signed Accept URL (`acceptUrl`).
 * - `ZIXFLOW_BOOKING_REJECT_URL_TEMPLATE_VAR` — duplicate full signed Decline URL (`rejectUrl`).
 * Match each env value to the **keyName** from Zixflow “Get Template Variables” for your URL button components.
 *
 * Accept/Reject quick replies send plain text (“Accept”) — they complete when Zixflow POSTs the inbound payload
 * to `/api/webhooks/zixflow` with `Authorization: Bearer ZIXFLOW_WEBHOOK_SECRET` (see Zixflow Incoming WhatsApp Message).
 *
 * **Template B — pick exact slot (“View catalog”)** after mentor taps Accept:
 * | Meta `{{n}}` | Key            | Source                                              |
 * |-------------|----------------|-----------------------------------------------------|
 * | {{1}}       | mentorName     | `User.name` (mentor)                                |
 * | {{2}}       | studentName    | `User.name` (student)                               |
 * | {{3}}       | requestedDate  | Date from `BookingRequest.startAt`                  |
 * | {{4}}       | requestedRange | Range `BookingRequest.startAt` … `endAt`            |
 * | (button)    | catalogUrl     | `{getPublicSiteBaseUrl()}/select-slot?bookingId=…&token=…` |
 *
 * For a **tap-to-open catalog** URL button, set `ZIXFLOW_BOOKING_CATALOG_URL_TEMPLATE_VAR` to that component’s keyName.
 */
export const ZIXFLOW_DEFAULT_BOOKING_REQUEST_BODY_ORDER =
  "mentorName,studentName,college,year,studentProfile,requestedTime";

/** Maps Meta {{1}}–{{4}} + catalog URL variable when Zixflow expects it as `body_5`. */
export const ZIXFLOW_DEFAULT_TIME_SLOTS_BODY_ORDER =
  "mentorName,studentName,requestedDate,requestedRange,catalogUrl";

export const ZIXFLOW_DEFAULT_BOOKING_CONFIRMED_BODY_ORDER = "studentName,mentorName,startISO,meetLink";

/**
 * Maps logical keys → Zixflow `body_1`, `body_2`, … per `orderRaw` (comma / whitespace separated).
 * Every ordered key emits exactly one `body_N` so indices stay aligned with Meta {{N}} even when a value is empty.
 */
export function applyZixflowBodyVarOrder(base: Record<string, string>, orderRaw: string | undefined): Record<string, string> {
  const trimmed = orderRaw?.trim();
  if (!trimmed) return base;
  const keys = trimmed.split(/[\s,]+/).filter(Boolean);
  const out: Record<string, string> = {};
  let i = 1;
  for (const k of keys) {
    const rawVal = base[k];
    out[`body_${i}`] = typeof rawVal === "string" ? rawVal : "";
    i++;
  }
  return out;
}
