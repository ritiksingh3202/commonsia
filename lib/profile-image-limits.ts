/**
 * Shared upload-size limits for profile photo (`User.image`) and cover photo
 * (`User.bannerImageUrl`). Enforced in three places so a bad payload can't sneak
 * through any path:
 *
 *  1. Client cropper/compressor (`lib/crop-cover-client.ts`,
 *     `lib/resize-image-client.ts`) — keeps JPEG quality stepping down until the
 *     encoded bytes fit under the cap, then throws with a human message.
 *  2. Server PATCH handler (`app/api/profile/route.ts`) — validates any
 *     incoming `data:` URL before it hits Prisma.
 *  3. (implicit) Anything stored before this cap was introduced is untouched —
 *     validation only runs on writes, never on reads, so existing users keep
 *     their photos no matter how large they were compressed historically.
 */

/** 500 KB — hard ceiling on the decoded image bytes we will accept for a profile photo. */
export const MAX_PROFILE_IMAGE_BYTES = 500 * 1024;

/** 500 KB — hard ceiling on the decoded image bytes we will accept for a cover photo. */
export const MAX_COVER_IMAGE_BYTES = 500 * 1024;

/** Used in UI copy and error messages. Kept as a constant so every surface reads the same label. */
export const PROFILE_IMAGE_SIZE_LABEL = "500 KB";
export const COVER_IMAGE_SIZE_LABEL = "500 KB";

/** True for strings of the form `data:<mime>;base64,<payload>` (our own canvas outputs). */
export function isDataUrl(value: string): boolean {
  return /^data:[^;,]+;base64,/i.test(value);
}

/**
 * Decode the number of real bytes a base64 `data:` URL represents — without
 * materialising a `Buffer` (avoids a 500 KB alloc per call on the hot PATCH
 * path, and keeps this file safe to import from client bundles too).
 *
 * Formula: every 4 base64 chars encode 3 bytes, minus 1 byte per `=` pad.
 * Non-base64 data URLs (e.g. `data:image/svg+xml;utf8,<svg...>`) fall back to
 * the raw payload length, which is a tight upper bound on their byte count.
 *
 * For non-data inputs (http/https CDN URL, OAuth provider image) we return
 * `0` — callers treat those as "no embedded payload to count".
 */
export function dataUrlByteLength(value: string): number {
  if (!value) return 0;
  const comma = value.indexOf(",");
  if (comma < 0) return 0;
  const header = value.slice(0, comma);
  if (!header.startsWith("data:")) return 0;
  const payload = value.slice(comma + 1);
  if (/;base64$/i.test(header)) {
    let padding = 0;
    if (payload.endsWith("==")) padding = 2;
    else if (payload.endsWith("=")) padding = 1;
    return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
  }
  return payload.length;
}

/**
 * Short helper for friendly error/UI text like "480 KB" or "1.1 MB". Used only
 * when reporting a user-facing rejection so we don't need a heavy formatter.
 */
export function formatBytesShort(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}
