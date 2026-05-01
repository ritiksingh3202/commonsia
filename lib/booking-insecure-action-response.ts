import { NextResponse } from "next/server";

/**
 * HTML response for legacy or mistaken URLs such as `/api/booking/accept?bookingId=…`.
 * Accept/Reject **must** use signed tokens (`/api/webhooks/zixflow?token=…`) — never raw IDs.
 */
export function insecureBookingActionNoticeResponse(): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Use your WhatsApp link · Commonsia</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#fafafa;color:#111;margin:0;padding:24px;line-height:1.5;}
.card{max-width:28rem;margin:48px auto;background:#fff;border-radius:16px;padding:28px 24px;box-shadow:0 8px 30px rgba(0,0,0,.08);}
h1{font-size:1.25rem;margin:0 0 12px;color:#b45309;}
p{margin:0 0 12px;font-size:15px;color:#374151;}
</style>
</head>
<body>
<div class="card">
<h1>Use the link from WhatsApp</h1>
<p>For security, Commonsia does not confirm sessions using only a booking ID in the URL. Tap <strong>Accept</strong> or <strong>Decline</strong> from your latest Commonsia WhatsApp message — those links are signed.</p>
<p>If a link expired or fails, ask the student to send a new booking request.</p>
</div>
</body>
</html>`;
  return new NextResponse(html, {
    status: 400,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
