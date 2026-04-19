import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";

import { getGoogleOAuthClient, getLinkedInOAuthClient } from "@/lib/oauth-credentials";
import { resolveAuthSecret } from "@/lib/auth-secret";
import { prisma } from "@/lib/prisma";

/**
 * OAuth (Auth.js v5):
 * - AUTH_SECRET — required in production (or NEXTAUTH_SECRET). Generate: `npx auth secret`
 * - AUTH_URL — e.g. https://www.yoursite.com (no trailing slash). Set on Vercel.
 * - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (fallback: AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET)
 * - LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET (fallback: AUTH_LINKEDIN_*)
 * - DATABASE_URL — Neon Postgres (see `.env.example`)
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
function isLocalDevHost(host: string | null | undefined) {
  if (!host) return false;
  const hostname = host.split(":")[0]?.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

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
        }),
      ]
    : []),
  ...(linkedinOAuth
    ? [
        LinkedInProvider({
          clientId: linkedinOAuth.clientId,
          clientSecret: linkedinOAuth.clientSecret,
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth((req) => {
  const host = req?.headers.get("x-forwarded-host") ?? req?.headers.get("host");
  const proto = req?.headers.get("x-forwarded-proto") ?? "http";
  const isLocal = isLocalDevHost(host);

  // If a production AUTH_URL/NEXTAUTH_URL is set while developing on localhost,
  // Auth.js will issue Secure cookies + build OAuth callback URLs for prod,
  // which breaks CSRF/session and Google/LinkedIn sign-in on http://localhost.
  if (process.env.NODE_ENV !== "production" && isLocal && host) {
    const origin = `${proto === "https" ? "https" : "http"}://${host}`;
    process.env.AUTH_URL = origin;
    process.env.NEXTAUTH_URL = origin;
  }

  const useSecureCookies = !isLocal && (proto === "https" || process.env.NODE_ENV === "production");

  return {
    adapter: PrismaAdapter(prisma),
    trustHost: true,
    secret: resolveAuthSecret(),
    basePath: "/api/auth",
    cookies: cookieConfig(useSecureCookies),
    pages: {
      signIn: "/auth/login",
      error: "/auth/error",
    },
    /** Set `AUTH_DEBUG=1` in Vercel temporarily to log OAuth details (then remove). */
    debug: process.env.AUTH_DEBUG === "1",
    session: {
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

          const user = await prisma.user.findUnique({ where: { email } });
          if (!user?.passwordHash) return null;

          const ok = await bcrypt.compare(password, user.passwordHash);
          if (!ok) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          };
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user, trigger }) {
        if (user?.id) {
          token.id = user.id;
        }
        const uid = (token.id as string | undefined) ?? (token.sub as string | undefined);
        if (uid && (user || trigger === "update")) {
          try {
            const u = await prisma.user.findUnique({
              where: { id: uid },
              select: { role: true },
            });
            token.role = u?.role ?? null;
          } catch {
            token.role = null;
          }
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = (token.id as string) ?? (token.sub as string);
          session.user.role = (token.role as string | null) ?? null;
        }
        return session;
      },
    },
  };
});
