import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";

import { getGoogleOAuthClient, getLinkedInOAuthClient } from "@/lib/oauth-credentials";
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
 *
 * Callback URLs:
 * - Google: {AUTH_URL}/api/auth/callback/google
 * - LinkedIn: {AUTH_URL}/api/auth/callback/linkedin
 */
const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

const googleOAuth = getGoogleOAuthClient();
const linkedinOAuth = getLinkedInOAuthClient();

const oauthProviders = [];
if (googleOAuth) {
  oauthProviders.push(
    GoogleProvider({
      clientId: googleOAuth.clientId,
      clientSecret: googleOAuth.clientSecret,
    }),
  );
}
if (linkedinOAuth) {
  oauthProviders.push(
    LinkedInProvider({
      clientId: linkedinOAuth.clientId,
      clientSecret: linkedinOAuth.clientSecret,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  secret: authSecret,
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
});
