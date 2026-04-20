/**
 * Helpers so Auth.js `redirect`, env vars, and browser origin stay aligned (apex vs www, trailing slashes).
 * Mismatches here cause “random” login failures: cookies on one host, redirects to another, CSRF/session lost.
 */

export function trimTrailingSlash(url: string): string {
  const t = url.trim();
  if (!t) return t;
  return t.replace(/\/+$/, "") || t;
}

export function stripWwwHost(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

/** Same registrable host ignoring leading `www.` (both must be same protocol). */
export function sameWwwApexUrl(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.protocol === ub.protocol && stripWwwHost(ua.hostname) === stripWwwHost(ub.hostname);
  } catch {
    return false;
  }
}

/**
 * When `url` is absolute and on the same apex/www site as `canonicalBase`, rewrite origin to canonical.
 * Keeps path/query/hash from `url` (e.g. OAuth callbackUrl) while fixing host drift.
 */
export function rewriteUrlToCanonicalOrigin(url: string, canonicalBase: string): string | null {
  try {
    const target = new URL(url);
    const canon = new URL(trimTrailingSlash(canonicalBase));
    if (target.protocol !== canon.protocol) return null;
    if (stripWwwHost(target.hostname) !== stripWwwHost(canon.hostname)) return null;
    if (target.origin === canon.origin) return url;
    return `${canon.origin}${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}
