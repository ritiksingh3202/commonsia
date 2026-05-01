import { createHmac, timingSafeEqual } from "crypto";

function secretBytes(): Buffer | null {
  const s = process.env.BOOKING_ACTION_SECRET?.trim();
  if (!s) return null;
  return Buffer.from(s, "utf8");
}

/** Signed URL token so the mentor can confirm one granular start inside the student’s requested window. */
export function signSlotPick(opts: { bookingRequestId: string; rawToken: string; slotStartISO: string }): string | null {
  const secret = secretBytes();
  if (!secret) return null;
  const payload = `${opts.bookingRequestId}|slot_pick|${opts.rawToken}|${opts.slotStartISO}`;
  const sig = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  return `${payload}|${sig}`;
}

export function verifySlotPickSignedToken(
  signed: string,
): { ok: true; bookingRequestId: string; rawToken: string; slotStartISO: string } | { ok: false } {
  const secret = secretBytes();
  if (!secret) return { ok: false };
  const lastPipe = signed.lastIndexOf("|");
  if (lastPipe <= 0) return { ok: false };
  const payload = signed.slice(0, lastPipe);
  const sig = signed.slice(lastPipe + 1);
  const parts = payload.split("|");
  if (parts.length !== 4) return { ok: false };
  const [bookingRequestId, action, rawToken, slotStartISO] = parts;
  if (!bookingRequestId || action !== "slot_pick" || !rawToken || !slotStartISO) return { ok: false };

  const expected = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(sig, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };

  const slotStart = new Date(slotStartISO);
  if (Number.isNaN(slotStart.getTime())) return { ok: false };

  return { ok: true, bookingRequestId, rawToken, slotStartISO };
}

/** Lets the mentor open the slot-picker page after Accept (WhatsApp “View catalog”). */
export function signCatalogAccess(opts: { bookingRequestId: string; rawToken: string }): string | null {
  const secret = secretBytes();
  if (!secret) return null;
  const payload = `${opts.bookingRequestId}|catalog_access|${opts.rawToken}`;
  const sig = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  return `${payload}|${sig}`;
}

export function verifyCatalogAccessSignedToken(
  signed: string,
): { ok: true; bookingRequestId: string; rawToken: string } | { ok: false } {
  const secret = secretBytes();
  if (!secret) return { ok: false };
  const lastPipe = signed.lastIndexOf("|");
  if (lastPipe <= 0) return { ok: false };
  const payload = signed.slice(0, lastPipe);
  const sig = signed.slice(lastPipe + 1);
  const parts = payload.split("|");
  if (parts.length !== 3) return { ok: false };
  const [bookingRequestId, action, rawToken] = parts;
  if (!bookingRequestId || action !== "catalog_access" || !rawToken) return { ok: false };

  const expected = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(sig, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };

  return { ok: true, bookingRequestId, rawToken };
}
