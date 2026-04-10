import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { sanitizeCalendarOAuthReturnTo } from "@/lib/calendar-oauth-return-to";
import { signCalendarOAuthState } from "@/lib/calendar-oauth-state";
import { getGoogleOAuthClient } from "@/lib/oauth-credentials";

export async function GET(req: Request) {
  const baseRaw = process.env.AUTH_URL ?? "http://localhost:3000";
  const origin = baseRaw.replace(/\/$/, "");
  const reqUrl = new URL(req.url);
  const returnTo = sanitizeCalendarOAuthReturnTo(reqUrl.searchParams.get("returnTo"));
  const authorizeSelf = `${origin}/api/calendar/google/authorize${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;

  const session = await auth();
  if (!session?.user?.id) {
    const login = new URL("/auth/login", origin);
    login.searchParams.set("callbackUrl", authorizeSelf);
    return NextResponse.redirect(login);
  }

  const google = getGoogleOAuthClient();
  if (!google) {
    return NextResponse.json(
      { error: "Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)." },
      { status: 500 },
    );
  }
  const { clientId } = google;

  const state = signCalendarOAuthState(session.user.id, returnTo);
  const redirectUri = `${origin}/api/calendar/google/callback`;

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    ["openid", "email", "profile", "https://www.googleapis.com/auth/calendar"].join(" "),
  );
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
