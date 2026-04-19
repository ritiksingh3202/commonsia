import type { NextConfig } from "next";

if (process.env.VERCEL === "1") {
  const hasAuthSecret = Boolean(
    (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "").trim().length,
  );
  if (!hasAuthSecret) {
    throw new Error(
      "Missing AUTH_SECRET (or NEXTAUTH_SECRET). Add it in Vercel → Project → Settings → Environment Variables. Generate a value locally with: npx auth secret",
    );
  }
}

const nextConfig: NextConfig = {
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
