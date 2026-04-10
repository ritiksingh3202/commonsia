import { createHmac, timingSafeEqual } from "crypto";

import { sanitizeCalendarOAuthReturnTo } from "@/lib/calendar-oauth-return-to";

function calendarOAuthSecret(): string | undefined {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
}

/** Signed state for Google Calendar OAuth (15 min TTL). */
export function signCalendarOAuthState(userId: string, returnTo?: string): string {
  const exp = Date.now() + 15 * 60 * 1000;
  const payload = JSON.stringify({
    userId,
    exp,
    ...(returnTo ? { returnTo } : {}),
  });
  const data = Buffer.from(payload).toString("base64url");
  const secret = calendarOAuthSecret() ?? "";
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyCalendarOAuthState(token: string): { userId: string; returnTo?: string } | null {
  const secret = calendarOAuthSecret();
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  if (!data || !sig) return null;
  const expected = createHmac("sha256", secret).update(data).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as {
      userId?: string;
      exp?: number;
      returnTo?: string;
    };
    if (!parsed.userId || typeof parsed.exp !== "number") return null;
    if (parsed.exp < Date.now()) return null;
    const returnTo = sanitizeCalendarOAuthReturnTo(parsed.returnTo ?? undefined);
    return { userId: parsed.userId, ...(returnTo ? { returnTo } : {}) };
  } catch {
    return null;
  }
}
