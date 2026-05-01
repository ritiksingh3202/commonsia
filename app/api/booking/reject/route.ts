import { insecureBookingActionNoticeResponse } from "@/lib/booking-insecure-action-response";

export const runtime = "nodejs";

/** Decline flows run via signed `GET /api/webhooks/zixflow?token=…` (from WhatsApp). This route blocks unsafe `bookingId`-only URLs. */
export function GET() {
  return insecureBookingActionNoticeResponse();
}
