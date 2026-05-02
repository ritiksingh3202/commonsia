/**
 * Logical keys → Zixflow `body_1`, `body_2`, … order defaults.
 *
 * **Template — Meta `mentorship_session_booking` (“Mentorship Session Booking”)** — example body:
 *
 * ```
 * Hello {{1}},
 *
 * {{2}}, a {{3}} year student from {{4}}, has requested a mentorship session with you on Commonsia.
 *
 * Student Profile:
 * {{5}}
 *
 * Requested Time:
 * {{6}}
 * ```
 *
 * | Meta `{{n}}` | Key             | Meaning / source                                                                 |
 * |-------------|-----------------|-----------------------------------------------------------------------------------|
 * | {{1}}       | mentorName      | Mentor’s display name (`User.name`) — after “Hello …,”                            |
 * | {{2}}       | studentName     | Student’s display name                                                          |
 * | {{3}}       | year            | Year of study (`User.yearOfStudy`)                                                |
 * | {{4}}       | college         | College (`User.university`, fallback `User.major`)                              |
 * | {{5}}       | studentProfile  | Mentor-facing student profile URL                                                |
 * | {{6}}       | requestedTime   | **Booked slice**: human range from `BookingRequest.startAt`/`endAt` — first session-length interval at band start |
 *
 * Set `ZIXFLOW_BOOKING_REQUEST_TEMPLATE=mentorship_session_booking` (or your Meta-registered name).
 *
 * **Clickable Accept/Reject:** Map Meta URL buttons to the **full signed** URLs from our payload (`acceptUrl` / `rejectUrl`)
 * pointing at `/api/webhooks/zixflow?token=…`. Do **not** use `/api/booking/accept?bookingId=…` (unsupported; insecure).
 *
 * Accept/Reject quick replies POST inbound payloads to `/api/webhooks/zixflow` with `Authorization: Bearer ZIXFLOW_WEBHOOK_SECRET`.
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
/** Body order for Meta `mentorship_session_booking` ({{1}} mentor … {{6}} time). Override via `ZIXFLOW_BOOKING_BODY_VARS_ORDER`. */
export const ZIXFLOW_DEFAULT_BOOKING_REQUEST_BODY_ORDER =
  "mentorName,studentName,year,college,studentProfile,requestedTime";

/** Maps Meta {{1}}–{{4}} + catalog URL variable when Zixflow expects it as `body_5`. */
export const ZIXFLOW_DEFAULT_TIME_SLOTS_BODY_ORDER =
  "mentorName,studentName,requestedDate,requestedRange,catalogUrl";

/**
 * 3-var default (`{{1}}`=studentName, `{{2}}`=mentorName, `{{3}}`=date-range).
 * To include the Meet link as `{{4}}`, set:
 *   ZIXFLOW_BOOKING_CONFIRMED_BODY_VARS_ORDER=studentName,mentorName,startISO,meetLink
 * (your Zixflow templates must have body_4 mapped to {{4}} for Meet link).
 */
export const ZIXFLOW_DEFAULT_BOOKING_CONFIRMED_BODY_ORDER = "studentName,mentorName,startISO";

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
