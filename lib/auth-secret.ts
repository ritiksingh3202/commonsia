/**
 * Auth.js requires a non-empty `secret` for JWT/session cookies.
 * Production must set `AUTH_SECRET` or `NEXTAUTH_SECRET` (e.g. Vercel → Environment Variables).
 * Local `next dev` uses a fixed dev-only fallback so the app runs without copying secrets first.
 */
export function resolveAuthSecret(): string {
  const fromEnv = (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "").trim();
  if (fromEnv.length > 0) return fromEnv;

  if (process.env.NODE_ENV !== "production") {
    return "commonsia-local-dev-auth-secret-do-not-use-in-production-min-32-chars";
  }

  return "";
}
