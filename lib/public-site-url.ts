/** Production booking/WhatsApp links must use this origin when AUTH_URL would otherwise be localhost. */
const FALLBACK_PUBLIC_ORIGIN = "https://commonsia.com";

/**
 * Canonical HTTPS origin for outbound booking links (Accept/Reject URLs, student profile link,
 * `/select-slot` catalog URL). Avoids localhost in production builds when WhatsApp opens links on-device.
 */
export function getPublicSiteBaseUrl(): string {
  /** Tunnel / staging URL for WhatsApp links while AUTH_URL stays localhost (quick-reply webhooks + catalog URLs). */
  const bookingPublic = process.env.BOOKING_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (bookingPublic) return bookingPublic;

  const raw = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "").trim().replace(/\/$/, "");
  if (!raw) {
    return process.env.NODE_ENV === "production" ? FALLBACK_PUBLIC_ORIGIN : "http://localhost:3000";
  }
  const lower = raw.toLowerCase();
  const looksLocal =
    lower.includes("localhost") ||
    lower.startsWith("http://127.") ||
    /^http:\/\/192\.168\./i.test(raw) ||
    /^http:\/\/10\./i.test(raw);
  if (looksLocal && process.env.NODE_ENV === "production") {
    console.warn(
      `[commonsia] AUTH_URL (${raw}) looks non-public — using ${FALLBACK_PUBLIC_ORIGIN} for WhatsApp/booking absolute URLs.`,
    );
    return FALLBACK_PUBLIC_ORIGIN;
  }
  return raw;
}
