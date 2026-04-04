import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
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
 * Email/password uses `User.passwordHash` (bcrypt). JWT sessions are required for Credentials + adapter.
 *
 * Callback URLs to register in each provider’s console:
 * - Google: {AUTH_URL}/api/auth/callback/google
 * - LinkedIn: {AUTH_URL}/api/auth/callback/linkedin
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    Google,
    LinkedIn,
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
        const u = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        token.role = u?.role ?? null;
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
