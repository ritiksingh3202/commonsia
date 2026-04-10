/**
 * Safe relative path for redirect after Google Calendar OAuth (same-origin only).
 */
export function sanitizeCalendarOAuthReturnTo(raw: string | null | undefined): string | undefined {
  if (raw == null) return undefined;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return undefined;
  if (t.includes("://") || t.includes("?") || t.includes("#")) return undefined;
  if (/[\r\n\0]/.test(t)) return undefined;
  if (t.length > 256) return undefined;
  return t;
}

export const DEFAULT_CALENDAR_OAUTH_RETURN_PATH = "/mentor/availability";
