/**
 * Auth.js `session.strategy: "jwt"` stores an encrypted JWE in the session cookie. Vercel (and many
 * proxies) reject requests when the combined `Cookie` header exceeds ~32 KB (HTTP 431).
 *
 * Profile photos in this app may be stored as JPEG data URLs (`User.image`), which must never be
 * embedded in the JWT — only short HTTPS (or HTTP) URLs belong in session cookies.
 */
export const MAX_PROFILE_IMAGE_URL_IN_AUTH_COOKIE = 900;

export function profileImageSafeForAuthCookie(image: string | null | undefined): string | null {
  if (image == null) return null;
  const t = typeof image === "string" ? image.trim() : "";
  if (!t) return null;
  if (t.startsWith("data:")) return null;
  if (t.length > MAX_PROFILE_IMAGE_URL_IN_AUTH_COOKIE) return null;
  return t;
}
