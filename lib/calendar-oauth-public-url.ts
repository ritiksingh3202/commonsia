/**
 * Public origin for Google Calendar OAuth `redirect_uri`.
 * Must match exactly one "Authorized redirect URI" in Google Cloud Console
 * and must be identical between /authorize and /callback for the same flow.
 *
 * Prefer the incoming request (Host / X-Forwarded-*) so dev works whether you open
 * http://localhost:3000 or http://127.0.0.1:3000 — AUTH_URL-only builds often cause
 * Error 400: redirect_uri_mismatch when they differ.
 */
export function getCalendarOAuthPublicOrigin(req: Request): string {
  const url = new URL(req.url);
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.headers.get("host")?.trim();
  let proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (proto !== "http" && proto !== "https") {
    proto = url.protocol.replace(":", "") === "https" ? "https" : "http";
  }
  if (host) {
    return `${proto}://${host}`;
  }
  return url.origin;
}

export function getCalendarOAuthRedirectUri(req: Request): string {
  return `${getCalendarOAuthPublicOrigin(req)}/api/calendar/google/callback`;
}
