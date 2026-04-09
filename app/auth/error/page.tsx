import type { Metadata } from "next";
import Link from "next/link";

import { MarketingShell } from "@/components/layout/MarketingShell";
import { authErrorMessage } from "@/lib/auth-error-messages";

export const metadata: Metadata = {
  title: { absolute: "Sign-in error" },
  description: "We could not complete sign-in.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const message = authErrorMessage(sp.error);

  return (
    <MarketingShell>
      <div className="bg-white px-4 py-16">
        <div className="mx-auto max-w-md rounded-xl border border-[#e5e5e5] bg-white px-6 py-8 text-center shadow-sm">
          <h1 className="font-heading text-lg font-semibold text-[#0a0a0a]">Sign-in problem</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-[#717182]">{message}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/auth/login"
              className="rounded-md bg-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-primary/90"
            >
              Back to sign in
            </Link>
            <Link
              href="/auth"
              className="rounded-md border border-[#e5e5e5] px-4 py-2.5 text-[13px] font-medium text-[#0a0a0a] hover:bg-black/[0.03]"
            >
              Join
            </Link>
          </div>
        </div>
      </div>
    </MarketingShell>
  );
}
