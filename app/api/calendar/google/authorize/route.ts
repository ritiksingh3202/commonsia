import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { signCalendarOAuthState } from "@/lib/calendar-oauth-state";
import { getGoogleOAuthClient } from "@/lib/oauth-credentials";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/login?callbackUrl=/mentor/availability", process.env.AUTH_URL ?? "http://localhost:3000"));
  }

  const google = getGoogleOAuthClient();
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  if (!google) {
    return NextResponse.json(
      { error: "Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)." },
      { status: 500 },
    );
  }
  const { clientId } = google;

  const state = signCalendarOAuthState(session.user.id);
  const redirectUri = `${base.replace(/\/$/, "")}/api/calendar/google/callback`;

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    ["https://www.googleapis.com/auth/calendar.events", "openid", "email", "profile"].join(" "),
  );
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
