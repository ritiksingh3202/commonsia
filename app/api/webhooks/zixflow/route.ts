import { createHmac, timingSafeEqual } from "crypto";

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
import {
  createForumPostFromInbound,
  extractInboundMedia,
  resolveCommunityAuthorForInbound,
} from "@/lib/forum-inbound";
import { revalidatePath } from "next/cache";

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

function verifyMetaHmac(rawBody: string, sigHeader: string, appSecret: string): boolean {
  try {
    const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`;
    const a = Buffer.from(sigHeader.padEnd(expected.length), "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
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

/** Mentor taps Accept / Decline URL embedded in the Zixflow WhatsApp template.
 *  Also handles Meta webhook verification challenge (hub.mode=subscribe). */
export async function GET(req: Request) {
  const url = new URL(req.url);

  // Meta webhook verification challenge
  const mode = url.searchParams.get("hub.mode");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = url.searchParams.get("hub.verify_token");
  if (mode === "subscribe" && challenge) {
    const secret = process.env.ZIXFLOW_WEBHOOK_SECRET?.trim();
    if (secret && verifyToken === secret) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

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

/** Pull the message id + image URL out of common Zixflow / Meta inbound shapes. */
function extractInboundExtras(body: unknown): { messageId: string | null; imageUrl: string | null } {
  if (!body || typeof body !== "object") return { messageId: null, imageUrl: null };
  const o = body as Record<string, unknown>;

  let messageId: string | null = null;
  if (typeof o.messageId === "string" && o.messageId.trim()) messageId = o.messageId.trim();

  const messageNode =
    (o.message as Record<string, unknown> | undefined) ??
    (((o.data as Record<string, unknown> | undefined)?.message) as Record<string, unknown> | undefined) ??
    null;

  if (!messageId && messageNode && typeof (messageNode as Record<string, unknown>).id === "string") {
    messageId = ((messageNode as Record<string, unknown>).id as string).trim() || null;
  }

  if (!messageId) {
    const entry = Array.isArray(o.entry) ? (o.entry[0] as Record<string, unknown>) : null;
    const changes = entry && Array.isArray(entry.changes) ? (entry.changes[0] as Record<string, unknown>) : null;
    const value = changes?.value as Record<string, unknown> | undefined;
    const messages = value?.messages;
    const m0 = Array.isArray(messages) ? (messages[0] as Record<string, unknown>) : null;
    if (m0 && typeof m0.id === "string") messageId = m0.id.trim() || null;
    if (m0 && !messageNode) {
      const media = extractInboundMedia(m0);
      return { messageId, imageUrl: media.imageUrl };
    }
  }

  const media = extractInboundMedia(messageNode);
  return { messageId, imageUrl: media.imageUrl };
}

async function processInboundWhatsApp(
  body: unknown,
  logPrefix: string,
): Promise<Response> {
  const inbound = extractInboundWhatsAppFromWebhook(body);
  if (!inbound) {
    console.warn(
      `[${logPrefix}] unrecognized payload shape. Tip: webhook URL must be public HTTPS (deploy or ngrok); localhost is unreachable.`,
    );
    /**
     * Always 200 for unparseable payloads. Meta and Zixflow retry non-2xx responses for
     * ~24h; one bad shape would otherwise cause a webhook retry storm and rate-limit us.
     * The body still tells our own logs / dashboards what happened.
     */
    return NextResponse.json(
      { ok: true, ignored: true, reason: "unrecognized_payload" },
      { status: 200 },
    );
  }

  const action = parseBookingInboundQuickReply(inbound.messageText);
  console.info(`[${logPrefix}] inbound parsed:`, {
    fromDigitsTail: inbound.fromDigits.slice(-4),
    messageText: inbound.messageText,
    action: action ?? "(none)",
  });
  if (!action) {
    /**
     * Not a booking quick-reply. Try the community-post path: if the sender phone matches the
     * configured COMMUNITY_AUTHOR_USER_ID's WhatsApp digits, save the message (text/image/links)
     * as a public ForumPost and revalidate /community so the feed updates immediately.
     */
    const authorUserId = await resolveCommunityAuthorForInbound(inbound.fromDigits);
    if (authorUserId) {
      const extras = extractInboundExtras(body);
      const cleanText = inbound.messageText === "[media]" ? null : inbound.messageText;
      const created = await createForumPostFromInbound({
        authorUserId,
        text: cleanText,
        imageUrl: extras.imageUrl,
        whatsappMessageId: extras.messageId,
      });
      if (created) {
        try { revalidatePath("/community"); } catch { /* noop in tests */ }
        console.info(`[${logPrefix}] community post created:`, created);
        return NextResponse.json({ ok: true, forumPostId: created }, { status: 200 });
      }
      return NextResponse.json({ ok: true, ignored: true, reason: "empty_post" }, { status: 200 });
    }
    return NextResponse.json({ ok: true, ignored: true, reason: "not_booking_quick_reply" }, { status: 200 });
  }

  const mentorId = await findMentorUserIdByInboundDigits(inbound.fromDigits);
  if (!mentorId) {
    console.warn(`[${logPrefix}] booking quick reply from unknown WhatsApp:`, `${inbound.fromDigits.slice(0, 4)}…`);
    return NextResponse.json({ ok: true, ignored: true, reason: "unknown_sender" }, { status: 200 });
  }

  if (action === "accept") {
    const resolved = await resolveBookingIdForInboundAccept(mentorId);
    if (resolved.kind === "respond") {
      console.info(`[${logPrefix}] Accept response:`, resolved.title, resolved.ok ? "(ok)" : "(error)");
      return NextResponse.json(
        { ok: resolved.ok, title: resolved.title, message: resolved.message },
        { status: 200 },
      );
    }
    console.info(`[${logPrefix}] Accept: finalize bookingRequestId=`, resolved.bookingRequestId);
    const r = await finalizeBookingRequestAccept({ bookingRequestId: resolved.bookingRequestId, verifiedMentorId: mentorId });
    console.info(`[${logPrefix}] inbound Accept done:`, resolved.bookingRequestId, r.ok, r.title);
    /** Always 200 to ack the webhook even on logical failure — Meta retries non-2xx for ~24h. */
    return NextResponse.json({ ok: r.ok, title: r.title, message: r.message }, { status: 200 });
  }

  const resolved = await resolveBookingIdForInboundReject(mentorId);
  if (resolved.kind === "respond") {
    console.info(`[${logPrefix}] Reject response:`, resolved.title);
    return NextResponse.json(
      { ok: resolved.ok, title: resolved.title, message: resolved.message },
      { status: resolved.status },
    );
  }
  console.info(`[${logPrefix}] Reject: finalize bookingRequestId=`, resolved.bookingRequestId);
  const r = await finalizeBookingRequestReject({ bookingRequestId: resolved.bookingRequestId, verifiedMentorId: mentorId });
  console.info(`[${logPrefix}] inbound Reject done:`, resolved.bookingRequestId, r.ok, r.title);
  return NextResponse.json({ ok: r.ok, title: r.title, message: r.message }, { status: r.ok ? 200 : 400 });
}

/**
 * POST webhook: handles both Meta Cloud API webhooks (x-hub-signature-256) and Zixflow webhooks
 * (Authorization: Bearer / x-zixflow-secret). Meta path processes inbound "Accept"/"Reject" button taps.
 * Zixflow path also handles signed Accept/Reject URL tokens forwarded from mentor WhatsApp messages.
 */
export async function POST(req: Request) {
  const metaSig = req.headers.get("x-hub-signature-256")?.trim();

  if (metaSig) {
    const rawBody = await req.text();
    const metaAppSecret = process.env.META_APP_SECRET?.trim();
    if (metaAppSecret && !verifyMetaHmac(rawBody, metaSig, metaAppSecret)) {
      console.warn("[meta-webhook] HMAC verification failed");
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }
    try { console.log("[meta-webhook]", JSON.stringify(body)); } catch { /* ignore */ }

    // Meta sends status/delivery notifications too - ACK them all with 200 (Meta retries on non-2xx)
    const inbound = extractInboundWhatsAppFromWebhook(body);
    if (!inbound) {
      return NextResponse.json({ ok: true, ignored: true, reason: "no_inbound_message" }, { status: 200 });
    }
    return processInboundWhatsApp(body, "meta-webhook");
  }

  // --- Zixflow / legacy path ---
  const secret = process.env.ZIXFLOW_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "POST disabled until ZIXFLOW_WEBHOOK_SECRET is set. Without it, mentors must open the Accept/Decline links (GET)." },
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
  try { console.log("[zixflow-webhook]", JSON.stringify(body)); } catch { console.log("[zixflow-webhook]", "[non-serializable payload]"); }

  const token = extractTokenFromZixflowBody(body);
  if (token) {
    console.info("[zixflow-webhook] routing: signed_token");
    const r = await processBookingToken(token);
    console.info("[zixflow-webhook] token pipeline result:", r.ok, r.title);
    /** Always 200 to ack the webhook even on logical failure — Meta retries non-2xx for ~24h. */
    return NextResponse.json({ ok: r.ok, title: r.title, message: r.message }, { status: 200 });
  }

  return processInboundWhatsApp(body, "zixflow-webhook");
}
