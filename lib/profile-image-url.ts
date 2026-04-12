/**
 * OAuth providers often persist small avatar URLs (e.g. LinkedIn `shrink_100_100`, Google `=s96-c`).
 * Upscale hints in the URL so the browser / image optimizer load a sharper source when displayed larger.
 */
export function highResProfileImageUrl(url: string): string {
  const u = url.trim();
  if (!u) return u;

  try {
    const parsed = new URL(u);
    const host = parsed.hostname.toLowerCase();

    if (host === "media.licdn.com" || host.endsWith(".licdn.com")) {
      return upgradeLinkedInCdnUrl(u);
    }

    if (host.endsWith("googleusercontent.com") || host === "lh3.googleusercontent.com") {
      return upgradeGoogleUserContentUrl(u);
    }
  } catch {
    // Invalid URL — return as-is (e.g. relative paths handled elsewhere)
  }

  return u;
}

function upgradeLinkedInCdnUrl(url: string): string {
  // e.g. profile-displayphoto-shrink_100_100 → 800px artifact (sharp on retina cards)
  let out = url.replace(/profile-displayphoto-shrink_\d+_\d+/g, "profile-displayphoto-shrink_800_800");
  // Some paths use /shrink_W_H/ only for small thumbs — bump those, leave larger assets alone
  out = out.replace(/\/shrink_(\d+)_(\d+)\//g, (match, w: string, h: string) => {
    const a = Number(w);
    const b = Number(h);
    if (a <= 200 && b <= 200) return "/shrink_800_800/";
    return match;
  });
  return out;
}

function upgradeGoogleUserContentUrl(url: string): string {
  // Size token is usually ...=s96-c or ...=s96 at end of path / before & — bump small thumbs only
  return url.replace(/=s(\d+)(-c)?(?=&|$|#)/gi, (match, sizeStr: string, crop: string | undefined) => {
    const n = Number(sizeStr);
    if (n >= 400) return match;
    return crop ? "=s800-c" : "=s800";
  });
}
