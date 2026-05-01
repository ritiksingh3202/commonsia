/**
 * OAuth client for **Google sign-in** (`/api/auth/callback/google`).
 * Prefer `GOOGLE_LOGIN_*` when you use a separate Google Cloud client for Calendar/Meet.
 */
export function getGoogleOAuthClient(): { clientId: string; clientSecret: string } | null {
  const clientId =
    process.env.GOOGLE_LOGIN_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID;
  const clientSecret =
    process.env.GOOGLE_LOGIN_CLIENT_SECRET ??
    process.env.GOOGLE_CLIENT_SECRET ??
    process.env.AUTH_GOOGLE_SECRET;
  if (!clientId?.trim() || !clientSecret?.trim()) return null;
  return { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
}

/**
 * OAuth client for **Calendar connect** (`/api/calendar/google/*`) and **admin fallback** events.
 * Prefer `GOOGLE_MEET_CLIENT_*` when set; otherwise reuses sign-in credentials.
 */
export function getGoogleCalendarOAuthClient(): { clientId: string; clientSecret: string } | null {
  const meetId = process.env.GOOGLE_MEET_CLIENT_ID?.trim();
  const meetSecret = process.env.GOOGLE_MEET_CLIENT_SECRET?.trim();
  if (meetId && meetSecret) return { clientId: meetId, clientSecret: meetSecret };
  return getGoogleOAuthClient();
}

export function getLinkedInOAuthClient(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.LINKEDIN_CLIENT_ID ?? process.env.AUTH_LINKEDIN_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET ?? process.env.AUTH_LINKEDIN_SECRET;
  if (!clientId?.trim() || !clientSecret?.trim()) return null;
  return { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
}
