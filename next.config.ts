import type { NextConfig } from "next";

import { assertValidDatabaseUrlForVercelBuild } from "./lib/db-url-env";

/**
 * The bundled Auth.js client reads `NEXTAUTH_URL` before `AUTH_URL`. If production only sets
 * `AUTH_URL`, copy it here so `/api/auth/*` and CSRF calls target the same origin as the server.
 */
(() => {
  const authUrl = process.env.AUTH_URL?.trim();
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
  if (authUrl && !nextAuthUrl) {
    process.env.NEXTAUTH_URL = authUrl;
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
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.figma.com",
        pathname: "/api/mcp/asset/**",
      },
      /** OAuth avatars (LinkedIn / Google) — optimized with high-res URL hints in MentorAvatar */
      { protocol: "https", hostname: "media.licdn.com", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "lh4.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "lh5.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "lh6.googleusercontent.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
