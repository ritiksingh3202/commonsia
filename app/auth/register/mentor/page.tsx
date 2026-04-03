import type { Metadata } from "next";
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
  const { callbackUrl: raw } = await searchParams;
  const oauthCallbackUrl =
    raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  return (
    <MarketingShell>
      <div className="bg-white">
        <SignupForm role="mentor" oauthCallbackUrl={oauthCallbackUrl} />
      </div>
    </MarketingShell>
  );
}
