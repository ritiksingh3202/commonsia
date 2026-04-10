import type { Metadata } from "next";
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
  const safeNext =
    raw && typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
  /** Onboarding-aware landing; optional `next` preserved for completed profiles */
  const callbackUrl = safeNext
    ? `/auth/continue?next=${encodeURIComponent(safeNext)}`
    : "/auth/continue";

  return (
    <MarketingShell>
      <div className="bg-white">
        <LoginForm callbackUrl={callbackUrl} authError={sp.error} />
      </div>
    </MarketingShell>
  );
}
