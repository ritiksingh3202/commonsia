"use client";

import { MergeSignupDraft } from "@/components/auth/MergeSignupDraft";

/**
 * OAuth signup merge runs in the marketing shell. `SessionProvider` lives once in the root
 * `AuthSessionProvider` — a nested provider here duplicated context and could confuse session
 * refresh after `signIn`.
 */
export function MarketingChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MergeSignupDraft />
      {children}
    </>
  );
}
