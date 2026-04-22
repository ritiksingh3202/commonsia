"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { MergeSignupDraft } from "@/components/auth/MergeSignupDraft";

/**
 * The root layout now passes a server-rendered `session` so `useSession()` consumers mount with
 * `status: "authenticated" | "unauthenticated"` immediately — no initial `/api/auth/session`
 * round-trip. Pass explicit `null` (vs `undefined`) means the client never auto-fetches on mount.
 *
 * `MergeSignupDraft` must live under `SessionProvider` on **every** route (including `/student/setup/*`)
 * so OAuth signups that land directly on setup still merge `sessionStorage` name/role into `/api/profile`.
 *
 * Refetch knobs are all disabled because the dev logs showed the client polling `/api/auth/session`
 * on tab focus / visibility / reconnect events, which was waking the server every few seconds.
 *  - `refetchOnWindowFocus: false` — tab focus no longer triggers a session request
 *  - `refetchWhenOffline: false` — don't poll while offline
 *  - `refetchInterval: 0` — disable the periodic poll (default is already 0, kept explicit)
 * The session still refreshes whenever a component calls `update()` (e.g. after role change), so
 * this does NOT break sign-in, sign-out, or role-refresh flows.
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
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
      refetchInterval={0}
    >
      <MergeSignupDraft />
      {children}
    </SessionProvider>
  );
}
