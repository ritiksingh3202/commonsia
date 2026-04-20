"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { MergeSignupDraft } from "@/components/auth/MergeSignupDraft";

/**
 * Omit `session` so the shell renders without blocking on `auth()` in the root layout; the client
 * loads `/api/auth/session` once (usually fast). Pass `session` from a page/layout when you want
 * to skip that round-trip (e.g. sensitive server-rendered UI).
 *
 * `MergeSignupDraft` must live under `SessionProvider` on **every** route (including `/student/setup/*`)
 * so OAuth signups that land directly on setup still merge `sessionStorage` name/role into `/api/profile`.
 */
export function AuthSessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  /** Omitted → client fetches session. `null` / object → used as the initial snapshot. */
  session?: Session | null;
}) {
  return (
    <SessionProvider
      session={session === undefined ? undefined : session}
      basePath="/api/auth"
      /** Avoids a `/api/auth/session` round-trip on every tab focus (major cause of “sluggish” UI). */
      refetchOnWindowFocus={false}
    >
      <MergeSignupDraft />
      {children}
    </SessionProvider>
  );
}
