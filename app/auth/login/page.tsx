import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { MarketingShell } from "@/components/layout/MarketingShell";

export const metadata: Metadata = {
  title: { absolute: "Sign in" },
  description: "Sign in to your Commonsia account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const raw = sp.callbackUrl;
  const safe =
    raw && typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
  /**
   * Auth.js `callbackUrl` after sign-in.
   * - Plain paths like `/student` → wrap as `/auth/continue?next=…` (server resolves onboarding).
   * - Already `/auth/continue?…` (e.g. from Choose Role) → use as-is to avoid double-wrapping.
   */
  const callbackUrl =
    safe && safe.startsWith("/auth/continue")
      ? safe
      : safe
        ? `/auth/continue?next=${encodeURIComponent(safe)}`
        : "/auth/continue";

  const session = await auth();
  if (session?.user?.id) {
    redirect(callbackUrl);
  }

  return (
    <MarketingShell>
      <div className="bg-white">
        <LoginForm callbackUrl={callbackUrl} authError={sp.error} />
      </div>
    </MarketingShell>
  );
}
