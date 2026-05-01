import { google } from "googleapis";

import { getGoogleCalendarRefreshToken } from "@/lib/google-calendar-db";
import { getGoogleCalendarOAuthClient } from "@/lib/oauth-credentials";
import { prisma } from "@/lib/prisma";

/**
 * Refresh token from mentor "Connect Calendar" flow, or from Google sign-in (Account row).
 */
export async function getGoogleCalendarRefreshTokenForUser(userId: string): Promise<string | null> {
  const fromUser = await getGoogleCalendarRefreshToken(userId);
  if (fromUser) return fromUser;
  const acc = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: { refresh_token: true },
  });
  return acc?.refresh_token ?? null;
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
