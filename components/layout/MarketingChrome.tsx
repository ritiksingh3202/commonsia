"use client";

import { SessionProvider } from "next-auth/react";

import { MergeSignupDraft } from "@/components/auth/MergeSignupDraft";

/**
 * Keeps `SessionProvider` in the same client subtree as `Navbar` and other marketing UI.
 * Some App Router + Turbopack combinations fail to thread next-auth context from the root
 * layout through a server `MarketingShell` fragment to `Navbar`.
 */
export function MarketingChrome({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/api/auth" refetchOnWindowFocus>
      <MergeSignupDraft />
      {children}
    </SessionProvider>
  );
}
