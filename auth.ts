import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";

import { warnDevLoopbackAuthUrlEnvMismatchOnce } from "@/lib/auth-oauth-host-warn";
import { profileImageSafeForAuthCookie } from "@/lib/auth-session-cookie-profile";
import { rewriteUrlToCanonicalOrigin, sameWwwApexUrl, trimTrailingSlash } from "@/lib/auth-url-canonical";
import { resolveAuthSecret, warnIfUsingEphemeralDevAuthSecret } from "@/lib/auth-secret";
import { isDevRequestHost } from "@/lib/dev-request-host";
import { getGoogleOAuthClient, getLinkedInOAuthClient } from "@/lib/oauth-credentials";
import { prisma } from "@/lib/prisma";
import { highResProfileImageUrl } from "@/lib/profile-image-url";

/**
 * OAuth (Auth.js v5):
 * - AUTH_SECRET — required in production (or NEXTAUTH_SECRET). Generate: `npx auth secret`
 * - AUTH_URL — e.g. https://www.commonsia.com (no trailing slash). Must match the hostname in the browser (www vs apex).
 * - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (fallback: AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET)
 * - LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET (fallback: AUTH_LINKEDIN_*)
 * - DATABASE_URL — Postgres (e.g. Supabase; see `.env.example`)
 *
 * LinkedIn app must include the "Sign in with LinkedIn using OpenID Connect" product.
 * That product only returns lite OpenID claims (name, picture, email, locale) — not headline, employer, cover, or phone.
 *
 * Callback URLs:
 * - Google: {AUTH_URL}/api/auth/callback/google
 * - LinkedIn: {AUTH_URL}/api/auth/callback/linkedin
 *
 * Google Calendar: **not** requested on sign-in — calendar access uses the separate
 * `/api/calendar/google/authorize` flow so Google “Sign in” stays on basic scopes (`openid email profile`)
 * and works without Google’s sensitive-scope verification for the main OAuth client.
 */
function cookieConfig(useSecureCookies: boolean) {
  const cookiePrefix = useSecureCookies ? "__Secure-" : "";
  const csrfPrefix = useSecureCookies ? "__Host-" : "";
  return {
    sessionToken: {
      name: `${cookiePrefix}authjs.session-token`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: useSecureCookies },
    },
    callbackUrl: {
      name: `${cookiePrefix}authjs.callback-url`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: useSecureCookies },
    },
    csrfToken: {
      name: `${csrfPrefix}authjs.csrf-token`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: useSecureCookies },
    },
    pkceCodeVerifier: {
      name: `${cookiePrefix}authjs.pkce.code_verifier`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: useSecureCookies, maxAge: 60 * 15 },
    },
    state: {
      name: `${cookiePrefix}authjs.state`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: useSecureCookies, maxAge: 60 * 15 },
    },
    nonce: {
      name: `${cookiePrefix}authjs.nonce`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: useSecureCookies },
    },
    webauthnChallenge: {
      name: `${cookiePrefix}authjs.challenge`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: useSecureCookies, maxAge: 60 * 15 },
    },
  } as const;
}

const googleOAuth = getGoogleOAuthClient();
const linkedinOAuth = getLinkedInOAuthClient();

/**
 * OAuth providers send thumbnails in `picture` by default — LinkedIn `shrink_100_100` (100×100) and
 * Google `=s96-c` (96×96). Persisting those as `User.image` makes retina avatars look blurry on
 * the 200–320 px card thumbnails and the profile hero. `highResProfileImageUrl` rewrites the URL
 * to a ~400px max-edge variant before the PrismaAdapter writes it to the DB (enough for 2× retina
 * at card width without storing 800px sources).
 */
function pickHighResPicture(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return highResProfileImageUrl(trimmed, 400);
}

const oauthProviders = [
  ...(googleOAuth
    ? [
        GoogleProvider({
          clientId: googleOAuth.clientId,
          clientSecret: googleOAuth.clientSecret,
          /**
           * Link Google to an existing user with the same verified email (e.g. they registered with password first).
           * @see https://authjs.dev/concepts#security
           */
          allowDangerousEmailAccountLinking: true,
          authorization: {
            params: {
              access_type: "offline",
              /** Basic scopes only — avoids “app not verified” / blocked sign-in for sensitive Calendar scope. */
              scope: "openid email profile",
            },
          },
          profile(profile) {
            return {
              id: profile.sub,
              name: profile.name ?? null,
              email: profile.email ?? null,
              image: pickHighResPicture(profile.picture),
            };
          },
        }),
      ]
    : []),
  ...(linkedinOAuth
    ? [
        LinkedInProvider({
          clientId: linkedinOAuth.clientId,
          clientSecret: linkedinOAuth.clientSecret,
          allowDangerousEmailAccountLinking: true,
          /**
           * LinkedIn OIDC returns `picture` as a signed `media.licdn.com` URL with a time-limited
           * signature (`?e=…&v=beta&t=…`). The default Auth.js profile() only maps `picture → image`
           * with no upscaling — it saves the 100×100 thumbnail, which looks fuzzy on retina cards.
           * We upgrade to the 800×800 variant here so new signups get a sharp avatar out of the box.
           */
          profile(profile) {
            return {
              id: profile.sub,
              name: profile.name ?? null,
              email: profile.email ?? null,
              image: pickHighResPicture(profile.picture),
            };
          },
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth((req) => {
  /** Snapshot before dev origin pinning — used for loopback mismatch warnings only. */
  const authUrlBeforePin = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "").trim();

  const host = req?.headers.get("x-forwarded-host") ?? req?.headers.get("host");
  const proto = req?.headers.get("x-forwarded-proto") ?? "http";
  const isLocal = isDevRequestHost(host);
  const isNonProduction = process.env.NODE_ENV !== "production";
  const hostname = (host ?? "").split(":")[0]?.toLowerCase() ?? "";

  warnIfUsingEphemeralDevAuthSecret();
  /** Avoid overwriting `AUTH_URL` on real Vercel preview/prod hosts when `NODE_ENV` is development (rare). */
  const isVercelAppHost = hostname.endsWith(".vercel.app");

  // Pin Auth.js public URL to the **current request** origin in dev (localhost, LAN, ngrok, etc.) so
  // OAuth callbacks and CSRF match the browser even when `.env` still has a production AUTH_URL.
  const shouldPinAuthOriginToRequest =
    Boolean(host) && (isLocal || (isNonProduction && !isVercelAppHost));

  if (shouldPinAuthOriginToRequest) {
    const origin = trimTrailingSlash(`${proto === "https" ? "https" : "http"}://${host}`);
    process.env.AUTH_URL = origin;
    process.env.NEXTAUTH_URL = origin;
  }

  if (hostname) {
    warnDevLoopbackAuthUrlEnvMismatchOnce(authUrlBeforePin, hostname);
  }

  /**
   * `useSecureCookies` MUST be stable across every invocation of this factory for a given
   * deployment, otherwise the cookie NAME toggles between `authjs.session-token` and
   * `__Secure-authjs.session-token` across requests. On Vercel production at least one internal
   * warm-up/routing call can reach this factory without `x-forwarded-proto: https`, causing
   * Auth.js to read the unprefixed name even though the browser holds the `__Secure-` cookie —
   * session is silently lost (401 on every protected route). Keep `next start` on plain HTTP
   * safe by falling back to the per-request `proto`; only flip on prod-like env signals.
   */
  const authUrlRaw = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "").trim();
  const authUrlIsHttps = /^https:\/\//i.test(authUrlRaw);
  const isVercelProdLike =
    process.env.VERCEL === "1" &&
    (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview");
  const useSecureCookies = authUrlIsHttps || isVercelProdLike || proto === "https";

  const secret = resolveAuthSecret(host);
  if (!secret) {
    console.error(
      "[auth] Missing AUTH_SECRET / NEXTAUTH_SECRET in production (non-local host). " +
        "Sign-in will fail with error=Configuration until this is set (e.g. `npx auth secret`).",
    );
  }

  return {
    adapter: PrismaAdapter(prisma),
    trustHost: true,
    secret,
    basePath: "/api/auth",
    cookies: cookieConfig(useSecureCookies),
    pages: {
      signIn: "/auth/login",
      error: "/auth/error",
    },
    /** Set `AUTH_DEBUG=1` in Vercel temporarily to log OAuth details (then remove). */
    debug: process.env.AUTH_DEBUG === "1",
    events: {
      async signIn({ user, account, profile }) {
        if (process.env.AUTH_DEBUG === "1") {
          console.log("[auth][debug] signIn", { userId: user?.id, provider: account?.provider });
        }

        /**
         * Keep the stored `User.image` fresh from OAuth on every sign-in.
         *
         * This fixes two distinct production bugs for LinkedIn (and defensively for Google):
         *
         * 1. **Account linking.** `PrismaAdapter.linkAccount` ONLY inserts an `Account` row — it
         *    never updates `User.image`. So a user who signs up with email+password first and
         *    later clicks “Continue with LinkedIn” keeps a null `image` forever, even though
         *    LinkedIn is returning a perfectly good picture in the OIDC userinfo response.
         *
         * 2. **Signed URL expiry.** LinkedIn’s `media.licdn.com` picture URLs carry a time-limited
         *    `?e=…&t=…` signature. The URL we save at signup eventually expires; re-syncing on
         *    every sign-in guarantees we always hold a currently-valid URL.
         *
         * We never overwrite a user-uploaded photo (`data:` URL) — only sync when the account
         * has no custom photo yet, or when the previous OAuth URL has drifted.
         */
        if (!user?.id || !account) return;
        if (account.provider !== "linkedin" && account.provider !== "google") return;

        const rawPicture = (profile as Record<string, unknown> | null | undefined)?.picture;
        const nextImage = pickHighResPicture(rawPicture);
        if (!nextImage) return;

        try {
          const existing = await prisma.user.findUnique({
            where: { id: user.id },
            select: { image: true },
          });
          /** User has uploaded a custom avatar (data URL proxied via /api/mentors/:id/photo) — never clobber. */
          const hasUserUploadedPhoto =
            typeof existing?.image === "string" && existing.image.trim().startsWith("data:");
          if (hasUserUploadedPhoto) return;

          if (existing?.image !== nextImage) {
            await prisma.user.update({
              where: { id: user.id },
              data: { image: nextImage },
            });
          }
        } catch (e) {
          /** Never block sign-in on an image sync failure — log & move on. */
          console.error("[auth][signIn] OAuth image sync failed:", e);
        }
      },
    },
    session: {
      /** DB adapter defaults to DB sessions, but Credentials requires JWT (@auth/core). Keep payloads tiny (see `jwt`). */
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60,
    },
    providers: [
      ...oauthProviders,
      Credentials({
        id: "credentials",
        name: "Email and password",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
          const password = typeof credentials?.password === "string" ? credentials.password : "";
          if (!email || !password) return null;

          try {
            const user = await prisma.user.findFirst({
              where: { email },
            });
            if (!user?.passwordHash) return null;

            const ok = await bcrypt.compare(password, user.passwordHash);
            if (!ok) return null;

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              /** Never put data URLs here — they inflate the JWT session cookie (Vercel 431). */
              image: profileImageSafeForAuthCookie(user.image) ?? undefined,
            };
          } catch (e) {
            /**
             * Uncaught errors in `authorize` are surfaced as `error=Configuration` (opaque).
             * Log here so the real cause (DB URL, pooler, missing tables) shows in the terminal.
             */
            console.error("[auth][credentials] authorize failed:", e);
            return null;
          }
        },
      }),
    ],
    callbacks: {
      /**
       * Default Auth.js behavior: only same-origin or relative URLs after sign-in.
       * Prevents open redirects if a forged `callbackUrl` slips through.
       */
      redirect({ url, baseUrl }) {
        const canonicalRaw = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "").trim();
        const canonicalBase = canonicalRaw ? trimTrailingSlash(canonicalRaw) : "";
        const baseTrimmed = trimTrailingSlash(baseUrl);

        if (url.startsWith("/")) {
          return `${baseTrimmed}${url}`;
        }
        try {
          const target = new URL(url);
          const baseParsed = new URL(baseUrl);
          if (target.origin === baseParsed.origin) {
            return url;
          }
          if (canonicalBase) {
            const fixed = rewriteUrlToCanonicalOrigin(url, canonicalBase);
            if (fixed) return fixed;
          }
          if (sameWwwApexUrl(url, baseUrl)) {
            return `${baseParsed.origin}${target.pathname}${target.search}${target.hash}`;
          }
        } catch {
          /* ignore */
        }
        return baseTrimmed;
      },
      async jwt({ token, user, trigger }) {
        if (user?.id) {
          token.id = user.id;
          /** Keep `sub` aligned with DB id so `session.user.id` is stable for credentials + OAuth. */
          token.sub = user.id;
        }
        const uid = ((token.id as string | undefined) ?? (token.sub as string | undefined))?.trim();

        /**
         * Refresh `role` from DB only when it matters:
         *  - Initial sign-in (`user` present)
         *  - Client calls `update()` (`trigger === "update"`)
         *  - Token has no role yet (e.g. very first OAuth issuance)
         * Avoids a DB round-trip on every request while still catching role changes after onboarding.
         */
        const shouldRefreshRole =
          !!uid && (Boolean(user) || trigger === "update" || token.role == null);

        if (shouldRefreshRole && uid) {
          try {
            const u = await prisma.user.findUnique({
              where: { id: uid },
              select: { role: true },
            });
            token.role = u?.role ?? null;
          } catch {
            if (token.role === undefined) token.role = null;
          }
        }

        /**
         * Keep the encrypted session JWE small: OAuth/account objects can attach token fields;
         * `picture` must never carry a multi-100KB data URL (profile photo storage).
         */
        const t = token as Record<string, unknown>;
        delete t.access_token;
        delete t.refresh_token;
        delete t.id_token;
        delete t.session_state;
        delete t.oauth_token;
        delete t.oauth_token_secret;
        const pic = t.picture;
        t.picture = profileImageSafeForAuthCookie(typeof pic === "string" ? pic : null);
        const img = t.image;
        if (typeof img === "string") {
          t.image = profileImageSafeForAuthCookie(img);
        }
        return token;
      },
      async session({ session, token }) {
        if (!session.user) return session;
        const uid = ((token.id as string | undefined) ?? (token.sub as string | undefined))?.trim();
        session.user.id = uid ?? "";
        session.user.role = (token.role as string | null) ?? null;
        session.user.image =
          profileImageSafeForAuthCookie(session.user.image) ??
          profileImageSafeForAuthCookie(token.picture as string | null) ??
          "";
        return session;
      },
    },
  };
});
