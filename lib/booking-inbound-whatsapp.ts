import { prisma } from "@/lib/prisma";
import { whatsappDigitsFromProfile } from "@/lib/zixflow";

/** Match Zixflow / Meta “from” fields to profile {@link whatsappDigitsFromProfile}. */
export function normalizeInboundWhatsAppDigits(from: string): string | null {
  const raw = from.trim();
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const cc = process.env.ZIXFLOW_DEFAULT_COUNTRY_CODE?.trim().replace(/\D/g, "");
  if (cc && digits.length === 10 && !digits.startsWith(cc)) {
    digits = `${cc}${digits}`;
  }
  return digits;
}

function digitsSuffix(d: string, n: number): string {
  return d.length <= n ? d : d.slice(-n);
}

export async function findMentorUserIdByInboundDigits(digits: string): Promise<string | null> {
  const mentors = await prisma.user.findMany({
    where: { role: "mentor" },
    select: { id: true, whatsappUrl: true, phone: true },
  });
  const target = digits.replace(/\D/g, "");
  if (target.length < 8) return null;
  const target10 = digitsSuffix(target, 10);

  for (const m of mentors) {
    const d = whatsappDigitsFromProfile(m);
    if (d && d === target) return m.id;
  }
  if (target10.length === 10) {
    for (const m of mentors) {
      const d = whatsappDigitsFromProfile(m);
      if (d && digitsSuffix(d, 10) === target10) return m.id;
    }
  }
  return null;
}

function tryPackInbound(from: unknown, text: unknown): { fromDigits: string; messageText: string } | null {
  if (typeof from !== "string" || !from.trim()) return null;
  const fd = normalizeInboundWhatsAppDigits(from);
  const txt = typeof text === "string" ? text.trim() : "";
  if (!fd || !txt) return null;
  return { fromDigits: fd, messageText: txt };
}

function extractFromMetaLikeValue(value: unknown): { fromDigits: string; messageText: string } | null {
  const messages = (value as Record<string, unknown>)?.messages;
  const m0 = (Array.isArray(messages) ? messages[0] : null) as Record<string, unknown> | null;
  if (!m0 || typeof m0 !== "object") return null;
  const from = m0.from;
  let text = "";
  if (m0.type === "interactive" && m0.interactive && typeof m0.interactive === "object") {
    const ir = m0.interactive as Record<string, unknown>;
    if (ir.type === "button_reply" && ir.button_reply && typeof ir.button_reply === "object") {
      const br = ir.button_reply as Record<string, unknown>;
      text =
        (typeof br.title === "string" ? br.title : "") ||
        (typeof br.id === "string" ? br.id : "") ||
        "";
    } else if (ir.type === "list_reply" && ir.list_reply && typeof ir.list_reply === "object") {
      const lr = ir.list_reply as Record<string, unknown>;
      text = (typeof lr.title === "string" ? lr.title : "") || (typeof lr.id === "string" ? lr.id : "") || "";
    }
  }
  // Template quick reply buttons: Meta sends type="button" with button.payload / button.text
  if (!text && m0.type === "button" && m0.button && typeof m0.button === "object") {
    const btn = m0.button as Record<string, unknown>;
    text =
      (typeof btn.text === "string" ? btn.text : "") ||
      (typeof btn.payload === "string" ? btn.payload : "") ||
      "";
    text = text.trim();
  }
  if (!text && m0.text && typeof m0.text === "object") {
    const tb = (m0.text as Record<string, unknown>).body;
    if (typeof tb === "string") text = tb;
  }
  if (!text && typeof m0.body === "string") text = m0.body;
  return tryPackInbound(from, text);
}

/**
 * Pull sender + body from Zixflow / Meta / generic webhook JSON shapes so quick-reply “Accept” hits
 * {@link app/api/webhooks/zixflow/route.ts} POST when `ZIXFLOW_WEBHOOK_SECRET` is set.
 */
export function extractInboundWhatsAppBookingSignal(body: unknown): {
  fromDigits: string;
  messageText: string;
} | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;

  const direct = tryPackInbound(
    o.from ?? o.wa_id ?? o.phone ?? o.sender,
    o.message ?? o.text ?? o.body ?? o.content ?? o.prompt,
  );
  if (direct) return direct;

  const msg = o.message ?? o.messages;
  const first = Array.isArray(msg) ? msg[0] : typeof msg === "object" && msg !== null ? msg : null;
  if (first && typeof first === "object") {
    const m = first as Record<string, unknown>;
    const interactive = m.interactive;
    let title = "";
    if (interactive && typeof interactive === "object") {
      const ir = interactive as Record<string, unknown>;
      const br = ir.button_reply;
      if (br && typeof br === "object") {
        const b = br as Record<string, unknown>;
        title = (typeof b.title === "string" ? b.title : "") || (typeof b.id === "string" ? b.id : "") || "";
      }
    }
    const textBody =
      typeof m.text === "object" && m.text !== null && typeof (m.text as Record<string, unknown>).body === "string"
        ? ((m.text as Record<string, unknown>).body as string)
        : typeof m.body === "string"
          ? m.body
          : title;
    const pack = tryPackInbound(m.from, textBody || title);
    if (pack) return pack;
  }

  const entry = Array.isArray(o.entry) ? (o.entry[0] as Record<string, unknown>) : null;
  const changes = entry && Array.isArray(entry.changes) ? (entry.changes[0] as Record<string, unknown>) : null;
  const value = changes?.value;
  if (value && typeof value === "object") {
    const hit = extractFromMetaLikeValue(value);
    if (hit) return hit;
  }

  const data = o.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const nested = tryPackInbound(d.from ?? d.wa_id, d.message ?? d.text ?? d.body);
    if (nested) return nested;
    const hit = extractFromMetaLikeValue(data);
    if (hit) return hit;
  }

  return null;
}

export type BookingInboundQuickReplyAction = "accept" | "reject";

export function parseBookingInboundQuickReply(text: string): BookingInboundQuickReplyAction | null {
  const t = text.trim();
  if (!t) return null;
  /** URL / plain “Accept”, “Reject”, and common payload ids (`session_accept`, `BTN_YES`). */
  if (/^(reject|decline)(\b|$|[._-])/i.test(t)) return "reject";
  if (/^no(\b|$|[._-])/i.test(t)) return "reject";
  if (/^(accept|yes|confirm)(\b|$|[._-])/i.test(t)) return "accept";
  const lower = t.toLowerCase();
  if (/^[a-z0-9_.-]+$/i.test(t)) {
    if (/reject|decline/.test(lower)) return "reject";
    if ((/accept|confirm|yes|ok/.test(lower)) && !/reject|decline/.test(lower)) return "accept";
  }
  if (/^accept\b/i.test(t)) return "accept";
  if (/^(reject|decline)\b/i.test(t)) return "reject";
  return null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Outer webhook JSON sometimes carries inbound fields at root (no `data` wrapper). */
function looksLikeInboundPayload(o: Record<string, unknown>): boolean {
  const c = asRecord(o.contact) ?? asRecord(o.customer) ?? asRecord(o.user);
  const hasFrom =
    typeof o.from === "string" ||
    typeof o.wa_id === "string" ||
    typeof o.phone === "string" ||
    typeof o.sender === "string" ||
    typeof o.senderId === "string" ||
    Boolean(c && (typeof c.phone === "string" || typeof c.wa_id === "string"));
  const hasBtn = asRecord(o.button) !== null;
  const hasMsg = o.message !== undefined && o.message !== null;
  const hasFlatText =
    typeof o.text === "string" ||
    typeof o.body === "string" ||
    typeof o.content === "string" ||
    typeof o.reply === "string" ||
    typeof o.replyText === "string";
  return hasFrom && (hasBtn || hasMsg || hasFlatText);
}

function getZixflowWebhookEventData(body: Record<string, unknown>): Record<string, unknown> | null {
  const tops: unknown[] = [
    body.data,
    body.payload,
    body.record,
    body.channelMessage,
    body.channel_message,
    body.webhookData,
    body.webhook_data,
    body.result,
  ];
  for (const t of tops) {
    const o = asRecord(t);
    if (o) return o;
  }

  const ev = asRecord(body.event);
  if (ev) {
    const inner = ev.data ?? ev.payload ?? ev.record ?? ev.message;
    const io = asRecord(inner);
    if (io) return io;
  }

  if (looksLikeInboundPayload(body)) return body;
  return null;
}

/**
 * Zixflow “Incoming WhatsApp Message” webhook (`Event with Data`): prefers `data.message` + `data.button`
 * shapes documented for your workspace.
 */
export function extractZixflowIncomingWhatsApp(body: unknown): {
  fromDigits: string;
  messageText: string;
} | null {
  if (!body || typeof body !== "object") return null;
  const d = getZixflowWebhookEventData(body as Record<string, unknown>);
  if (!d) return null;

  let text = "";
  const btn = d.button;
  if (btn && typeof btn === "object") {
    const b = btn as Record<string, unknown>;
    text =
      (typeof b.text === "string" ? b.text : "") ||
      (typeof b.title === "string" ? b.title : "") ||
      (typeof b.payload === "string" ? b.payload : "") ||
      "";
    text = text.trim();
  }

  const contact = asRecord(d.contact) ?? asRecord(d.customer) ?? asRecord(d.user);
  let fromRaw: unknown =
    d.from ??
    d.wa_id ??
    d.phone ??
    d.senderId ??
    d.sender ??
    d.mobile ??
    (contact ? contact.phone ?? contact.wa_id ?? contact.mobile ?? contact.whatsapp : undefined);

  const msg = d.message;
  if (msg && typeof msg === "object") {
    const mHead = msg as Record<string, unknown>;
    fromRaw = fromRaw ?? mHead.from ?? mHead.wa_id ?? mHead.phone;
  }

  if ((!text || text.length === 0) && msg !== undefined && msg !== null) {
    if (typeof msg === "string") {
      const trimmed = msg.trim();
      if (trimmed.startsWith("{")) {
        try {
          const parsed = JSON.parse(trimmed) as Record<string, unknown>;
          const tb = parsed.text;
          if (typeof tb === "string") text = tb.trim();
          else if (tb && typeof tb === "object" && typeof (tb as Record<string, unknown>).body === "string") {
            text = ((tb as Record<string, unknown>).body as string).trim();
          }
          fromRaw = fromRaw ?? parsed.from ?? parsed.wa_id;
        } catch {
          text = trimmed;
        }
      } else {
        text = trimmed;
      }
    } else if (typeof msg === "object") {
      const m = msg as Record<string, unknown>;
      fromRaw = fromRaw ?? m.from ?? m.wa_id ?? m.phone;
      const tb = m.text;
      if (typeof tb === "string") text = tb.trim();
      else if (tb && typeof tb === "object" && typeof (tb as Record<string, unknown>).body === "string") {
        text = ((tb as Record<string, unknown>).body as string).trim();
      }
      if (!text && typeof m.body === "string") text = m.body.trim();
      if (!text && m.interactive && typeof m.interactive === "object") {
        const ir = m.interactive as Record<string, unknown>;
        if (ir.type === "button_reply" && ir.button_reply && typeof ir.button_reply === "object") {
          const br = ir.button_reply as Record<string, unknown>;
          text =
            (typeof br.title === "string" ? br.title : "") ||
            (typeof br.id === "string" ? br.id : "") ||
            "";
          text = text.trim();
        }
      }
    }
  }

  if (!fromRaw && typeof msg === "object" && msg !== null) {
    const m = msg as Record<string, unknown>;
    fromRaw = m.from ?? m.wa_id;
  }

  if (!text && typeof d.text === "string") text = d.text.trim();
  if (!text && typeof d.body === "string") text = d.body.trim();
  if (!text && typeof d.content === "string") text = d.content.trim();
  if (!text && typeof d.reply === "string") text = d.reply.trim();
  if (!text && typeof d.replyText === "string") text = d.replyText.trim();

  const fromStr =
    typeof fromRaw === "string"
      ? fromRaw
      : fromRaw !== undefined && fromRaw !== null
        ? String(fromRaw)
        : "";

  const fd = normalizeInboundWhatsAppDigits(fromStr);
  if (!fd || !text) return null;
  return { fromDigits: fd, messageText: text };
}

/** Zixflow "incoming.whatsapp.message" event: sender.number + message.button.text */
function extractZixflowIncomingMessageEvent(body: unknown): {
  fromDigits: string;
  messageText: string;
} | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;

  const sender = asRecord(o.sender);
  const fromRaw =
    (sender && typeof sender.number === "string" ? sender.number : null) ??
    (sender && typeof sender.phone === "string" ? sender.phone : null);
  if (!fromRaw) return null;

  const msg = asRecord(o.message);
  if (!msg) return null;

  let text = "";
  const btn = asRecord(msg.button);
  if (btn && typeof btn.text === "string") text = btn.text.trim();
  if (!text && typeof msg.type === "string" && msg.type === "button" && typeof msg.body === "string") {
    text = msg.body.trim();
  }
  if (!text && typeof msg.text === "string") text = msg.text.trim();

  return tryPackInbound(fromRaw, text);
}

/** Try Zixflow event envelope first, then generic Meta/Zixflow shapes. */
export function extractInboundWhatsAppFromWebhook(body: unknown): {
  fromDigits: string;
  messageText: string;
} | null {
  const direct = extractZixflowIncomingMessageEvent(body);
  if (direct) return direct;
  const z = extractZixflowIncomingWhatsApp(body);
  if (z) return z;
  const generic = extractInboundWhatsAppBookingSignal(body);
  if (generic) return generic;
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  /** Last resort: nested `response` / `body` blobs some providers wrap once more. */
  for (const key of ["response", "body", "detail", "attributes"]) {
    const inner = asRecord(o[key]);
    if (!inner) continue;
    const hit = extractZixflowIncomingWhatsApp(inner) ?? extractInboundWhatsAppBookingSignal(inner);
    if (hit) return hit;
  }
  return null;
}

export async function resolveBookingIdForInboundAccept(mentorId: string): Promise<
  | { kind: "proceed"; bookingRequestId: string }
  | { kind: "respond"; ok: boolean; title: string; message: string; status: number }
> {
  const pending = await prisma.bookingRequest.findMany({
    where: { mentorId, status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 2,
    select: { id: true },
  });
  if (pending.length > 1) {
    return {
      kind: "respond",
      ok: false,
      title: "Multiple requests",
      message:
        "You have more than one pending session request. Open the Accept link in the WhatsApp message for the booking you mean.",
      status: 400,
    };
  }
  if (pending.length === 1) {
    return { kind: "proceed", bookingRequestId: pending[0].id };
  }

  const awaiting = await prisma.bookingRequest.findFirst({
    where: { mentorId, status: "awaiting_slot" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (awaiting) {
    return {
      kind: "respond",
      ok: true,
      title: "Pick a start time",
      message:
        "You already accepted this request. Open the View catalog link from Commonsia in WhatsApp to choose an exact start time.",
      status: 200,
    };
  }

  return {
    kind: "respond",
    ok: false,
    title: "Nothing pending",
    message: "No pending booking request was found for your account.",
    status: 400,
  };
}

export async function resolveBookingIdForInboundReject(mentorId: string): Promise<
  | { kind: "proceed"; bookingRequestId: string }
  | { kind: "respond"; ok: boolean; title: string; message: string; status: number }
> {
  const rows = await prisma.bookingRequest.findMany({
    where: { mentorId, status: { in: ["pending", "awaiting_slot"] } },
    orderBy: { createdAt: "desc" },
    take: 2,
    select: { id: true },
  });
  if (rows.length === 0) {
    return {
      kind: "respond",
      ok: false,
      title: "Nothing to decline",
      message: "No pending or in-progress booking request was found for your account.",
      status: 400,
    };
  }
  if (rows.length > 1) {
    return {
      kind: "respond",
      ok: false,
      title: "Multiple requests",
      message:
        "You have several open booking requests. Open the Decline link in the WhatsApp message for the one you mean.",
      status: 400,
    };
  }
  return { kind: "proceed", bookingRequestId: rows[0].id };
}
