import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

function secretBytes(): Buffer | null {
  const s = process.env.BOOKING_ACTION_SECRET?.trim();
  if (!s) return null;
  return Buffer.from(s, "utf8");
}

export function newRawBookingActionToken(): string {
  return randomBytes(32).toString("hex");
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function signBookingAction(opts: { bookingRequestId: string; action: "accept" | "reject"; rawToken: string }) {
  const secret = secretBytes();
  if (!secret) return null;
  const payload = `${opts.bookingRequestId}.${opts.action}.${opts.rawToken}`;
  const sig = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  return `${payload}.${sig}`;
}

export function verifyBookingActionSignedToken(
  signed: string,
): { ok: true; bookingRequestId: string; action: "accept" | "reject"; rawToken: string } | { ok: false } {
  const secret = secretBytes();
  if (!secret) return { ok: false };
  const parts = signed.split(".");
  if (parts.length !== 4) return { ok: false };
  const [bookingRequestId, actionRaw, rawToken, sig] = parts;
  if (actionRaw !== "accept" && actionRaw !== "reject") return { ok: false };
  if (!bookingRequestId || !rawToken || !sig) return { ok: false };

  const payload = `${bookingRequestId}.${actionRaw}.${rawToken}`;
  const expected = createHmac("sha256", secret).update(payload, "utf8").digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(sig, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };

  return { ok: true, bookingRequestId, action: actionRaw, rawToken };
}

