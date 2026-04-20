import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SignupForm } from "@/components/auth/SignupForm";
import { MarketingShell } from "@/components/layout/MarketingShell";

export const metadata: Metadata = {
  title: { absolute: "Mentor signup" },
  description: "Join Commonsia as a mentor and share your expertise.",
};

export default async function MentorRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user?.id?.trim()) {
    redirect("/auth/continue");
  }

  const { callbackUrl: raw } = await searchParams;
  const oauthCallbackUrl =
    raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/mentor/setup/1";

  return (
    <MarketingShell>
      <div className="bg-white">
        <SignupForm role="mentor" oauthCallbackUrl={oauthCallbackUrl} />
      </div>
    </MarketingShell>
  );
}
