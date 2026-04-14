"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { MergeSignupDraft } from "@/components/auth/MergeSignupDraft";

/**
 * Pass `session` from the root layout (`await auth()`) so the client does not immediately
 * call `/api/auth/session` on every load. That avoids noisy ClientFetchError when the dev
 * server is briefly unreachable (Turbopack restart, tab wake, etc.).
 */
export function AuthSessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  /** Server snapshot; `null` when logged out (still skips the extra initial client fetch). */
  session: Session | null;
}) {
  return (
    <SessionProvider session={session} basePath="/api/auth" refetchOnWindowFocus>
      <MergeSignupDraft />
      {children}
    </SessionProvider>
  );
}
