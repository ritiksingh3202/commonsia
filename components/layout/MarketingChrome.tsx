"use client";

/**
 * Marketing layout chrome. OAuth signup draft merge runs in root `AuthSessionProvider` so it also
 * applies on `/student/setup/*` and `/mentor/setup/*` after Google/LinkedIn redirect.
 */
export function MarketingChrome({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
