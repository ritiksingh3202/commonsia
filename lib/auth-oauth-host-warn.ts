/**
 * Warn when `.env` AUTH_URL uses `localhost` but the browser hit `127.0.0.1` (or vice versa).
 * OAuth redirect URIs are exact-string matched in Google / LinkedIn consoles.
 *
 * Pass `envAuthUrl` **before** `auth.ts` overwrites `process.env.AUTH_URL` with the request origin.
 */
export function warnDevLoopbackAuthUrlEnvMismatchOnce(envAuthUrl: string, requestHostname: string): void {
  if (process.env.NODE_ENV === "production") return;
  const g = globalThis as unknown as { __commonsiaOAuthHostWarn?: boolean };
  if (g.__commonsiaOAuthHostWarn) return;

  const raw = envAuthUrl.trim();
  if (!raw || !requestHostname.trim()) return;

  try {
    const envHost = new URL(raw).hostname.toLowerCase();
    const cur = requestHostname.toLowerCase();
    const loop = new Set(["localhost", "127.0.0.1"]);
    if (!loop.has(envHost) || !loop.has(cur) || envHost === cur) return;
    g.__commonsiaOAuthHostWarn = true;
    console.warn(
      `[auth] Request host is "${cur}" but AUTH_URL in .env used "${envHost}". ` +
        "This app pins AUTH_URL to the request origin in local dev, but you must register BOTH " +
        "http://localhost:3000 and http://127.0.0.1:3000 OAuth callback URLs (or use one host consistently).",
    );
  } catch {
    /* ignore */
  }
}
