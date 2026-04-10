/** Default hero cover image (`public/profile_cover.png`). */
export const DEFAULT_PROFILE_COVER_PATH = "/profile_cover.png";

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
  return DEFAULT_PROFILE_COVER_PATH;
}
