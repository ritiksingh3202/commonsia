import { google } from "googleapis";

import { getGoogleOAuthClient } from "@/lib/oauth-credentials";

export function getGoogleAdminOAuth2Client() {
  const refresh = process.env.GOOGLE_ADMIN_REFRESH_TOKEN?.trim();
  if (!refresh) return null;

  const googleCreds = getGoogleOAuthClient();
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

