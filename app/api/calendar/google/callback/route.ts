import { google } from "googleapis";
import { NextResponse } from "next/server";

import { setGoogleCalendarRefreshToken } from "@/lib/google-calendar-db";
import { verifyCalendarOAuthState } from "@/lib/calendar-oauth-state";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const back = `${base.replace(/\/$/, "")}/mentor/availability`;

  if (err) {
    return NextResponse.redirect(`${back}?calendar=error`);
  }

  const parsed = verifyCalendarOAuthState(state ?? "");
  if (!code || !parsed) {
    return NextResponse.redirect(`${back}?calendar=error`);
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  const redirectUri = `${base.replace(/\/$/, "")}/api/calendar/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${back}?calendar=error`);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
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
