import { NextResponse } from "next/server";

import { finalizeBookingRequestReject, type HtmlActionResult } from "@/lib/booking-request-finalize";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function htmlPage(r: HtmlActionResult): Response {
  const accent = r.ok ? "#166534" : "#b45309";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(r.title)} · Commonsia</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#fafafa;color:#111;margin:0;padding:24px;line-height:1.5;}
.card{max-width:28rem;margin:48px auto;background:#fff;border-radius:16px;padding:28px 24px;box-shadow:0 8px 30px rgba(0,0,0,.08);}
h1{font-size:1.25rem;margin:0 0 12px;color:${accent};}
p{margin:0;font-size:15px;color:#374151;}
.logo{font-size:13px;color:#9ca3af;margin-bottom:20px;}
</style>
</head>
<body>
<div class="logo">Commonsia</div>
<div class="card">
<h1>${escapeHtml(r.title)}</h1>
<p>${escapeHtml(r.message)}</p>
</div>
</body>
</html>`;
  return new NextResponse(html, {
    status: r.ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * WhatsApp URL button: `https://commonsia.com/api/booking/reject?bookingId=…`
 * Uses the stored `actionRawTokenOpaque` from BookingRequest to authenticate the action.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const bookingId = url.searchParams.get("bookingId")?.trim();

  if (!bookingId) {
    return htmlPage({
      ok: false,
      title: "Missing booking ID",
      message: "Open the Decline link from your WhatsApp booking message.",
    });
  }

  const booking = await prisma.bookingRequest.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true, actionRawTokenOpaque: true },
  });

  if (!booking) {
    return htmlPage({
      ok: false,
      title: "Not found",
      message: "No booking request found with this ID. It may have been removed or the link is incorrect.",
    });
  }

  if (booking.status === "rejected") {
    return htmlPage({
      ok: true,
      title: "Already declined",
      message: "You already declined this session request. Nothing else is needed.",
    });
  }

  if (booking.status === "accepted") {
    return htmlPage({
      ok: true,
      title: "Already accepted",
      message: "This session was already accepted — check your calendar or Commonsia dashboard.",
    });
  }

  const rawToken = booking.actionRawTokenOpaque?.trim();
  if (!rawToken) {
    return htmlPage({
      ok: false,
      title: "Link expired",
      message:
        "The action token for this booking has been consumed. Ask the student to send a new booking request if needed.",
    });
  }

  console.info("[booking/reject] Processing reject for bookingRequestId=", bookingId);

  const result = await finalizeBookingRequestReject({
    bookingRequestId: bookingId,
    rawToken,
  });

  console.info("[booking/reject] Result:", result.ok, result.title);

  return htmlPage(result);
}
