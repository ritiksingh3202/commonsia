import { google } from "googleapis";
import { NextResponse } from "next/server";

import { DEFAULT_CALENDAR_OAUTH_RETURN_PATH } from "@/lib/calendar-oauth-return-to";
import { setGoogleCalendarRefreshToken } from "@/lib/google-calendar-db";
import { getCalendarOAuthPublicOrigin, getCalendarOAuthRedirectUri } from "@/lib/calendar-oauth-public-url";
import { verifyCalendarOAuthState } from "@/lib/calendar-oauth-state";
import { getGoogleOAuthClient } from "@/lib/oauth-credentials";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const origin = getCalendarOAuthPublicOrigin(req);

  const parsed = verifyCalendarOAuthState(state ?? "");
  const path = parsed?.returnTo ?? DEFAULT_CALENDAR_OAUTH_RETURN_PATH;
  const back = `${origin}${path}`;

  if (err) {
    return NextResponse.redirect(`${back}?calendar=error`);
  }

  if (!code || !parsed) {
    return NextResponse.redirect(`${back}?calendar=error`);
  }

  const googleCreds = getGoogleOAuthClient();
  const redirectUri = getCalendarOAuthRedirectUri(req);

  if (!googleCreds) {
    return NextResponse.redirect(`${back}?calendar=error`);
  }

  const oauth2Client = new google.auth.OAuth2(
    googleCreds.clientId,
    googleCreds.clientSecret,
    redirectUri,
  );
  let tokens;
  try {
    const res = await oauth2Client.getToken(code);
    tokens = res.tokens;
  } catch {
    return NextResponse.redirect(`${back}?calendar=error`);
  }

  const refresh = tokens.refresh_token;
  if (refresh) {
    await setGoogleCalendarRefreshToken(parsed.userId, refresh);
  }

  return NextResponse.redirect(`${back}?calendar=connected`);
}
