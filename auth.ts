import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import LinkedIn from "next-auth/providers/linkedin";

import { prisma } from "@/lib/prisma";

/**
 * OAuth (Auth.js v5):
 * - AUTH_SECRET — required in production (or NEXTAUTH_SECRET). Generate: `npx auth secret`
 * - AUTH_URL — e.g. https://yourdomain.com (no trailing slash). Set on Vercel.
 * - AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET (aliases: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)
 * - AUTH_LINKEDIN_ID / AUTH_LINKEDIN_SECRET (aliases: LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET)
 * - DATABASE_URL — Neon Postgres (see `.env.example`)
 *
 * LinkedIn app must include the "Sign in with LinkedIn using OpenID Connect" product.
 *
 * Callback URLs:
 * - Google: {AUTH_URL}/api/auth/callback/google
 * - LinkedIn: {AUTH_URL}/api/auth/callback/linkedin
 */
const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

const googleId =
  process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleSecret =
  process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

const linkedinId =
  process.env.AUTH_LINKEDIN_ID ?? process.env.LINKEDIN_CLIENT_ID;
const linkedinSecret =
  process.env.AUTH_LINKEDIN_SECRET ?? process.env.LINKEDIN_CLIENT_SECRET;

const oauthProviders = [];
if (googleId && googleSecret) {
  oauthProviders.push(
    Google({ clientId: googleId, clientSecret: googleSecret }),
  );
}
if (linkedinId && linkedinSecret) {
  oauthProviders.push(
    LinkedIn({ clientId: linkedinId, clientSecret: linkedinSecret }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  secret: authSecret,
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        try {
          const u = await prisma.user.findUnique({
            where: { id: user.id },
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
