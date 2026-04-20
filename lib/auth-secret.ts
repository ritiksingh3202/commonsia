import { isDevRequestHost } from "@/lib/dev-request-host";

/**
 * Auth.js requires a non-empty `secret` for JWT/session cookies.
 * Production must set `AUTH_SECRET` or `NEXTAUTH_SECRET` (e.g. Vercel → Environment Variables).
 *
 * `next start` sets `NODE_ENV=production` even on localhost — without AUTH_SECRET in `.env`,
 * sign-in would hit `error=Configuration`. We still use a fixed dev-only secret when the
 * request host is clearly local so `npm run dev` / local `next start` work without secrets.
 */

const DEV_FALLBACK_SECRET = "commonsia-local-dev-auth-secret-do-not-use-in-production-min-32-chars";

/**
 * @param requestHost `Host` or `x-forwarded-host` from the incoming request (pass from `auth.ts`).
 */
export function resolveAuthSecret(requestHost?: string | null): string {
  const fromEnv = (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "").trim();
  if (fromEnv.length > 0) return fromEnv;

  const isNonProd = process.env.NODE_ENV !== "production";
  const isLocalMachine = isDevRequestHost(requestHost);

  if (isNonProd || isLocalMachine) {
    return DEV_FALLBACK_SECRET;
  }

  return "";
}
