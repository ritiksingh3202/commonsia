"use client";

import { SessionProvider } from "next-auth/react";

import { MergeSignupDraft } from "@/components/auth/MergeSignupDraft";

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MergeSignupDraft />
      {children}
    </SessionProvider>
  );
}
