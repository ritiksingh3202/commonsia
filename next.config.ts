import type { NextConfig } from "next";

import { assertValidDatabaseUrlForVercelBuild } from "./lib/db-url-env";

/**
 * The bundled Auth.js client reads `NEXTAUTH_URL` before `AUTH_URL`. If production only sets
 * `AUTH_URL`, copy it here so `/api/auth/*` and CSRF calls target the same origin as the server.
 */
(() => {
  const trim = (s: string) => s.replace(/\/+$/, "");
  const authUrl = process.env.AUTH_URL?.trim();
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
  if (authUrl) {
    const normalized = trim(authUrl);
    process.env.AUTH_URL = normalized;
    if (nextAuthUrl && trim(nextAuthUrl) !== normalized) {
      console.warn(
        `[next.config] NEXTAUTH_URL and AUTH_URL differed; using AUTH_URL (${normalized}) for both so Auth.js client and server use one canonical origin.`,
      );
    }
    process.env.NEXTAUTH_URL = normalized;
  } else if (nextAuthUrl) {
    process.env.NEXTAUTH_URL = trim(nextAuthUrl);
  }
  const n = process.env.NEXTAUTH_URL?.trim();
  if (n && process.env.NODE_ENV !== "production") {
    try {
      const p = new URL(n).pathname.replace(/\/$/, "") || "/";
      if (p !== "/" && p !== "/api/auth") {
        console.warn(
          `[next.config] NEXTAUTH_URL has pathname "${p}". next-auth/react uses this for client session ` +
            `fetch paths; it should be the site origin only (e.g. http://localhost:3000) or end with /api/auth. ` +
            `Wrong paths cause HTML 404 responses and ClientFetchError ("Unexpected token '<'").`,
        );
      }
    } catch {
      /* ignore */
    }
  }
})();

if (process.env.VERCEL === "1") {
  const hasAuthSecret = Boolean(
    (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "").trim().length,
  );
  if (!hasAuthSecret) {
    throw new Error(
      "Missing AUTH_SECRET (or NEXTAUTH_SECRET). Add it in Vercel → Project → Settings → Environment Variables. Generate a value locally with: npx auth secret",
    );
  }
  assertValidDatabaseUrlForVercelBuild();
}

const nextConfig: NextConfig = {
  /** Tree-shake `framer-motion` so each route only ships the motion primitives it uses. */
  experimental: {
    optimizePackageImports: ["framer-motion"],
  },
  poweredByHeader: false,
  /** In dev, default cover is replaced often — avoid long-lived browser / optimizer caches on this file. */
  ...(process.env.NODE_ENV === "development"
    ? {
        headers: async () => [
          {
            source: "/profile_cover.png",
            headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
          },
        ],
      }
    : {}),
  images: {
    /**
     * Next.js 16 defaults the allowed quality list to `[75]`. We keep the default —
     * `MentorAvatar` used to request `quality={95}` for card thumbnails, but the extra
     * bytes (~3–4× the file size) were invisible at the sizes we actually render. Any
     * new surface that legitimately needs a higher-quality variant should be added here
     * explicitly rather than sprinkled across components.
     */
    qualities: [75],
    /**
     * Cap optimized-image widths well below Next's defaults ([…1920, 2048, 3840]).
     *
     * The built-in image optimizer picks the smallest `deviceSizes` value that is ≥ the
     * effective display width from the component's `sizes` prop. If `sizes` is missing or
     * over-estimates (e.g. `100vw` on a laptop), Next reaches for 3840px — a 4K asset
     * served to every visitor regardless of their screen. The largest raster we actually
     * render full-bleed is the `/home_assets/steps.png` hero, which caps at ~1200px on a
     * 2× retina display — 1920 leaves generous headroom, 2048/3840 just burns bandwidth.
     *
     * Tightening `imageSizes` (used when `sizes` is smaller than the smallest device size,
     * e.g. avatar thumbnails) mirrors the change: small UI images cap at 384px instead of
     * the default 384, which is already reasonable — we keep the default here.
     *
     * Safe to adjust: values only affect which widths the optimizer will generate on
     * demand. No change to source assets; `<Image>` with a correct `sizes` prop still
     * picks the right candidate, just from a smaller menu.
     */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    /**
     * Prefer AVIF (smaller) then WebP. The optimizer already serves the best one the
     * browser can decode — adding AVIF shaves ~25–35% off JPEG/PNG payloads on Chromium
     * & Safari 16+, with a safe WebP fallback for anything else.
     */
    formats: ["image/avif", "image/webp"],
    /**
     * Next 16: local `next/image` src with a `?` query must match `localPatterns`.
     * Omit `search` so paths under `/` can use cache-bust (e.g. `/who_we_are_assets/x.png?v=…`)
     * while plain paths (e.g. `/home_assets/steps.png`) still match.
     */
    localPatterns: [{ pathname: "/**" }],
    remotePatterns: [
      /** OAuth avatars (LinkedIn / Google) — optimized with high-res URL hints in MentorAvatar */
      { protocol: "https", hostname: "media.licdn.com", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "lh4.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "lh5.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "lh6.googleusercontent.com", pathname: "/**" },
      /** Supabase Storage — uploaded avatars and banner images */
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
