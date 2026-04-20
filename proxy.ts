import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Next.js 16+ uses `proxy` (replaces deprecated `middleware`).
 * Redirect www ↔ apex to match `AUTH_URL` so OAuth cookies and redirect URIs align.
 */
export function proxy(request: NextRequest) {
  const raw = process.env.AUTH_URL?.trim();
  if (!raw) return NextResponse.next();

  let canonical: URL;
  try {
    canonical = new URL(raw);
  } catch {
    return NextResponse.next();
  }

  if (canonical.protocol !== "https:") return NextResponse.next();

  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (!host || host === canonical.hostname) return NextResponse.next();

  const stripWww = (h: string) => h.replace(/^www\./i, "");
  if (stripWww(host) !== stripWww(canonical.hostname)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.hostname = canonical.hostname;
  url.port = "";
  url.protocol = canonical.protocol;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: [
    /**
     * Skip `/api/*` — especially `/api/auth/session`. Redirecting those through www/apex can break
     * Auth.js `SessionProvider` (client `fetch` + `res.json()` → ClientFetchError: Unexpected token '<').
     */
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
