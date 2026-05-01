import { NextResponse } from "next/server";

import {
  extractInboundWhatsAppFromWebhook,
  findMentorUserIdByInboundDigits,
  parseBookingInboundQuickReply,
  resolveBookingIdForInboundAccept,
  resolveBookingIdForInboundReject,
} from "@/lib/booking-inbound-whatsapp";
import { verifyBookingActionSignedToken } from "@/lib/booking-action-token";
import { verifySlotPickSignedToken } from "@/lib/booking-slot-pick-token";
import {
  finalizeBookingRequestAccept,
  finalizeBookingRequestReject,
  finalizeBookingRequestSlotPick,
  type HtmlActionResult,
} from "@/lib/booking-request-finalize";

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

/** Matches Zixflow dashboard: `Authorization: Bearer <ZIXFLOW_WEBHOOK_SECRET>` (also accepts `x-zixflow-secret`). */
function verifyZixflowWebhookSecret(req: Request, secret: string): boolean {
  const hx = req.headers.get("x-zixflow-secret")?.trim();
  if (hx === secret) return true;
  const auth = req.headers.get("authorization")?.trim() ?? "";
  const m = /^Bearer\s+([\s\S]+)$/i.exec(auth);
  const tok = m?.[1]?.trim() ?? "";
  return tok === secret;
}

async function processBookingToken(token: string): Promise<HtmlActionResult> {
  const slotPick = verifySlotPickSignedToken(token);
  if (slotPick.ok) {
    return finalizeBookingRequestSlotPick({
      bookingRequestId: slotPick.bookingRequestId,
      rawToken: slotPick.rawToken,
      slotStartISO: slotPick.slotStartISO,
    });
  }

  const verified = verifyBookingActionSignedToken(token);
  if (!verified.ok) {
    return {
      ok: false,
      title: "Link invalid",
      message:
        "This link is invalid or has expired. Open the latest message from Commonsia or ask the student to send a new booking request.",
    };
  }

  if (verified.action === "reject") {
    return finalizeBookingRequestReject({
      bookingRequestId: verified.bookingRequestId,
      rawToken: verified.rawToken,
    });
  }

  return finalizeBookingRequestAccept({
    bookingRequestId: verified.bookingRequestId,
    rawToken: verified.rawToken,
  });
}

/** Mentor taps Accept / Decline URL embedded in the Zixflow WhatsApp template. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    return htmlPage({
      ok: false,
      title: "Missing link data",
      message: "Open Accept or Decline from your WhatsApp booking message.",
    });
  }
  const r = await processBookingToken(token);
  return htmlPage(r);
}

function extractTokenFromZixflowBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const direct = typeof o.token === "string" ? o.token.trim() : "";
  if (direct) return direct;

  const nested = ["data", "payload", "interactive", "message"].map((k) => o[k]).find(Boolean);
  if (nested && typeof nested === "object") {
    const t = (nested as Record<string, unknown>).token;
    if (typeof t === "string" && t.trim()) return t.trim();
    const url = (nested as Record<string, unknown>).url;
    if (typeof url === "string" && url.includes("token=")) {
      try {
        const u = new URL(url, "https://commonsia.invalid");
        const tok = u.searchParams.get("token")?.trim();
        if (tok) return tok;
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

/**
 * Zixflow POST webhook: signed Accept/Reject URL token **or** inbound WhatsApp quick replies (“Accept” /
 * “Reject”) when Zixflow forwards the mentor’s message JSON here. Requires `ZIXFLOW_WEBHOOK_SECRET`
 * (`Authorization: Bearer …` or `x-zixflow-secret`).
 */
export async function POST(req: Request) {
  const secret = process.env.ZIXFLOW_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "POST disabled until ZIXFLOW_WEBHOOK_SECRET is set. Without it, mentors must open the Accept/Decline links (GET). Quick-reply buttons need this webhook configured in Zixflow.",
      },
      { status: 503 },
    );
  }

  if (!verifyZixflowWebhookSecret(req, secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  try {
    console.log("[zixflow-webhook]", JSON.stringify(body));
  } catch {
    console.log("[zixflow-webhook]", "[non-serializable payload]");
  }

  const token = extractTokenFromZixflowBody(body);
  if (token) {
    console.info("[zixflow-webhook] routing: signed_token");
    const r = await processBookingToken(token);
    console.info("[zixflow-webhook] token pipeline result:", r.ok, r.title);
    return NextResponse.json(
      { ok: r.ok, title: r.title, message: r.message },
      { status: r.ok ? 200 : 400 },
    );
  }

  const inbound = extractInboundWhatsAppFromWebhook(body);
  if (inbound) {
    const action = parseBookingInboundQuickReply(inbound.messageText);
    console.info("[zixflow-webhook] inbound parsed:", {
      fromDigitsTail: inbound.fromDigits.slice(-4),
      messageText: inbound.messageText,
      action: action ?? "(none)",
    });
    if (!action) {
      return NextResponse.json({ ok: true, ignored: true, reason: "not_booking_quick_reply" }, { status: 200 });
    }

    const mentorId = await findMentorUserIdByInboundDigits(inbound.fromDigits);
    if (!mentorId) {
      console.warn(
        "[zixflow-webhook] booking quick reply from unknown WhatsApp:",
        `${inbound.fromDigits.slice(0, 4)}…`,
      );
      return NextResponse.json({ ok: true, ignored: true, reason: "unknown_sender" }, { status: 200 });
    }

    if (action === "accept") {
      const resolved = await resolveBookingIdForInboundAccept(mentorId);
      if (resolved.kind === "respond") {
        console.info("[zixflow-webhook] Accept response:", resolved.title, resolved.ok ? "(ok)" : "(error)");
        return NextResponse.json(
          { ok: resolved.ok, title: resolved.title, message: resolved.message },
          { status: resolved.status },
        );
      }
      console.info("[zixflow-webhook] Accept: finalize bookingRequestId=", resolved.bookingRequestId);
      const r = await finalizeBookingRequestAccept({
        bookingRequestId: resolved.bookingRequestId,
        verifiedMentorId: mentorId,
      });
      console.info("[zixflow-webhook] inbound Accept done:", resolved.bookingRequestId, r.ok, r.title);
      return NextResponse.json(
        { ok: r.ok, title: r.title, message: r.message },
        { status: r.ok ? 200 : 400 },
      );
    }

    const resolved = await resolveBookingIdForInboundReject(mentorId);
    if (resolved.kind === "respond") {
      console.info("[zixflow-webhook] Reject response:", resolved.title);
      return NextResponse.json(
        { ok: resolved.ok, title: resolved.title, message: resolved.message },
        { status: resolved.status },
      );
    }
    console.info("[zixflow-webhook] Reject: finalize bookingRequestId=", resolved.bookingRequestId);
    const r = await finalizeBookingRequestReject({
      bookingRequestId: resolved.bookingRequestId,
      verifiedMentorId: mentorId,
    });
    console.info("[zixflow-webhook] inbound Reject done:", resolved.bookingRequestId, r.ok, r.title);
    return NextResponse.json(
      { ok: r.ok, title: r.title, message: r.message },
      { status: r.ok ? 200 : 400 },
    );
  }

  console.warn(
    "[zixflow-webhook] unrecognized payload shape (see logged JSON above). Tip: WhatsApp quick-reply Accept sends POST from Zixflow/Meta servers — your webhook URL must be public HTTPS (deploy or ngrok); localhost is never reachable.",
  );
  return NextResponse.json(
    {
      ok: false,
      error:
        "Unrecognized payload — expected signed token, or inbound WhatsApp Accept/Reject with sender matching a mentor profile.",
    },
    { status: 400 },
  );
}
