import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/SignupForm";
import { MarketingShell } from "@/components/layout/MarketingShell";

export const metadata: Metadata = {
  title: { absolute: "Student signup" },
  description: "Join Commonsia as a student and connect with mentors.",
};

export default async function StudentRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl: raw } = await searchParams;
  const oauthCallbackUrl =
    raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/student/setup/1";

  return (
    <MarketingShell>
      <div className="bg-white">
        <SignupForm role="student" oauthCallbackUrl={oauthCallbackUrl} />
      </div>
    </MarketingShell>
  );
}
