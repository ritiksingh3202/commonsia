/** Default hero cover image (`public/profile_cover.png`). */
export const DEFAULT_PROFILE_COVER_PATH = "/profile_cover.png";

/**
 * Bump when you ship a new default PNG so browsers and the image optimizer
 * fetch the new file instead of a cached copy. Override anytime with
 * `NEXT_PUBLIC_PROFILE_COVER_V` in `.env.local` (no code change).
 */
function defaultCoverCacheKey(): string {
  const v = process.env.NEXT_PUBLIC_PROFILE_COVER_V?.trim();
  return v && v.length > 0 ? v : "1";
}

/** Default cover URL with cache-busting query (use for display & fetch). */
export function getDefaultProfileCoverUrl(): string {
  return `${DEFAULT_PROFILE_COVER_PATH}?v=${defaultCoverCacheKey()}`;
}

export function isDefaultProfileCoverPath(src: string | null | undefined): boolean {
  if (!src?.trim()) return false;
  const pathOnly = src.trim().split("?")[0];
  return pathOnly === DEFAULT_PROFILE_COVER_PATH;
}

/**
 * Wide banner (width:height). Higher = shorter vertical band on the page. Cropper, storage, and display share this.
 */
export const PROFILE_COVER_ASPECT_RATIO = 6;

export function profileCoverAspectStyle(): { aspectRatio: string } {
  return { aspectRatio: `${PROFILE_COVER_ASPECT_RATIO} / 1` };
}

export function profileCoverDisplaySrc(bannerImageUrl: string | null | undefined): string {
  const u = bannerImageUrl?.trim();
  if (u) return u;
  return getDefaultProfileCoverUrl();
}
