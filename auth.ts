import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import LinkedIn from "next-auth/providers/linkedin";

import { prisma } from "@/lib/prisma";

/**
 * OAuth uses env inference (Auth.js v5):
 * - AUTH_SECRET — required in production; generate with `npx auth secret`
 * - AUTH_URL — optional; e.g. https://yourdomain.com (defaults work on Vercel)
 * - AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
 * - AUTH_LINKEDIN_ID / AUTH_LINKEDIN_SECRET
 * - DATABASE_URL — Neon Postgres (see `.env.example`)
 *
 * Callback URLs to register in each provider’s console:
 * - Google: {AUTH_URL}/api/auth/callback/google
 * - LinkedIn: {AUTH_URL}/api/auth/callback/linkedin
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  providers: [Google, LinkedIn],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
