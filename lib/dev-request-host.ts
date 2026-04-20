/** Private IPv4 ranges treated like localhost for auth cookies and `AUTH_URL` alignment. */
function isPrivateLanIPv4(hostname: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 127) return true;
  return false;
}

/**
 * True for localhost, loopback, and typical LAN IPs — use for dev-only auth behavior
 * (`AUTH_URL` override, non-secure cookies on HTTP, optional `AUTH_SECRET` fallback).
 */
export function isDevRequestHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
  return isPrivateLanIPv4(hostname);
}
