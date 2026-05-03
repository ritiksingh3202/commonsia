import { google } from "googleapis";

import { getGoogleCalendarRefreshToken } from "@/lib/google-calendar-db";
import { getGoogleCalendarOAuthClient } from "@/lib/oauth-credentials";

/**
 * Refresh token from mentor "Connect Calendar" flow only.
 * Sign-in Account tokens are intentionally excluded — they were issued by GOOGLE_LOGIN_CLIENT_ID
 * which differs from GOOGLE_MEET_CLIENT_ID, causing unauthorized_client errors.
 */
export async function getGoogleCalendarRefreshTokenForUser(userId: string): Promise<string | null> {
  return getGoogleCalendarRefreshToken(userId);
}

export async function getGoogleCalendarOAuth2Client(forUserId: string) {
  const refresh = await getGoogleCalendarRefreshTokenForUser(forUserId);
  if (!refresh) return null;

  const googleCreds = getGoogleCalendarOAuthClient();
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const redirectUri = `${base.replace(/\/$/, "")}/api/calendar/google/callback`;
  if (!googleCreds) return null;

  const oauth2Client = new google.auth.OAuth2(
    googleCreds.clientId,
    googleCreds.clientSecret,
    redirectUri,
  );
  oauth2Client.setCredentials({ refresh_token: refresh });
  return oauth2Client;
}
