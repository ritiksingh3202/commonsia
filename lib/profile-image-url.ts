/**
 * OAuth providers often persist small avatar URLs (e.g. LinkedIn `shrink_100_100`, Google `=s96-c`).
 * Bump small thumbs to a modest edge size so `next/image` and `<img>` don’t have to work from
 * postage stamps — but avoid the old 800px default, which made the optimizer pull huge sources
 * for 80–320px UI (wasted bandwidth and CPU on every card/profile).
 */
export function highResProfileImageUrl(url: string, maxEdge: number = 400): string {
  const u = url.trim();
  if (!u) return u;

  /** Clamp so callers can ask e.g. 256 for a tiny home testimonial without extreme values. */
  const cap = Math.min(Math.max(Math.floor(maxEdge), 48), 800);

  try {
    const parsed = new URL(u);
    const host = parsed.hostname.toLowerCase();

    if (host === "media.licdn.com" || host.endsWith(".licdn.com")) {
      return upgradeLinkedInCdnUrl(u, cap);
    }

    if (host.endsWith("googleusercontent.com") || host === "lh3.googleusercontent.com") {
      return upgradeGoogleUserContentUrl(u, cap);
    }
  } catch {
    // Invalid URL — return as-is (e.g. relative paths handled elsewhere)
  }

  return u;
}

function upgradeLinkedInCdnUrl(url: string, maxEdge: number): string {
  const edge = String(maxEdge);
  let out = url.replace(
    /profile-displayphoto-shrink_\d+_\d+/g,
    `profile-displayphoto-shrink_${edge}_${edge}`,
  );
  out = out.replace(/\/shrink_(\d+)_(\d+)\//g, (match, w: string, h: string) => {
    const a = Number(w);
    const b = Number(h);
    if (a <= 200 && b <= 200) return `/shrink_${edge}_${edge}/`;
    return match;
  });
  return out;
}

function upgradeGoogleUserContentUrl(url: string, maxEdge: number): string {
  return url.replace(/=s(\d+)(-c)?(?=&|$|#)/gi, (match, sizeStr: string, crop: string | undefined) => {
    const n = Number(sizeStr);
    if (n >= maxEdge) return match;
    return crop ? `=s${maxEdge}-c` : `=s${maxEdge}`;
  });
}
