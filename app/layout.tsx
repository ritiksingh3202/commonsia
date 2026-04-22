import type { Metadata } from "next";
import { ABeeZee, Poppins } from "next/font/google";

import { auth } from "@/auth";
import { AuthSessionProvider } from "@/components/providers/AuthSessionProvider";
import { RouteProgressBar } from "@/components/nav/RouteProgressBar";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  adjustFontFallback: true,
});

const abeeZee = ABeeZee({
  variable: "--font-abeezee",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  adjustFontFallback: true,
});

/** Canonical origin for metadata (Open Graph, `icons` absolutization). Match production `AUTH_URL` / live host. */
function metadataBaseUrl(): URL {
  const raw = process.env.AUTH_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw);
    } catch {
      /* fall through */
    }
  }
  if (process.env.VERCEL_URL?.trim()) {
    const host = process.env.VERCEL_URL.trim().replace(/^https?:\/\//, "");
    return new URL(`https://${host}`);
  }
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: "Commonsia",
  description:
    "Connect with mentors, discuss design, and grow with the architecture student community.",
  /** Tab + PWA icons — keep `public/favicon.ico` (and optional svg/png) in sync with brand. */
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
  },
};

/**
 * Root layout is async so we can hydrate `SessionProvider` with the server-rendered session.
 * This avoids the extra `/api/auth/session` round-trip the client used to make on every initial
 * page load (you could see paired calls in the dev logs). `auth()` decodes the JWT locally and
 * does not touch Postgres unless a role refresh is needed — so the cost here is negligible,
 * while downstream `useSession()` consumers (`Navbar`, `MergeSignupDraft`, `HomePage`, chat and
 * schedule pages) get `status: "authenticated"` synchronously on mount.
 *
 * Important: the NextAuth v5 `Session` object includes a `user.image` that may be a huge data URL
 * for some accounts. `auth.ts` already sanitizes it via `profileImageSafeForAuthCookie` before
 * returning, so forwarding the session here does NOT bloat the initial HTML payload.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth">
      <body
        className={`${poppins.variable} ${abeeZee.variable} ${poppins.className} min-h-screen bg-[#ffffff] font-sans text-neutral-900 antialiased`}
      >
        <AuthSessionProvider session={session}>
          <RouteProgressBar />
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
