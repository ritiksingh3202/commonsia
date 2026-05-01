import { google } from "googleapis";

import { getGoogleCalendarOAuthClient } from "@/lib/oauth-credentials";

/** Calendar ID for Commonsia-admin inserts (`primary` or workspace email, e.g. hello@commonsia.com). */
export function getGoogleAdminCalendarId(): string {
  const raw = process.env.ADMIN_EMAIL?.trim();
  return raw && raw.includes("@") ? raw : "primary";
}

export function getGoogleAdminOAuth2Client() {
  const refresh = process.env.GOOGLE_ADMIN_REFRESH_TOKEN?.trim();
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

