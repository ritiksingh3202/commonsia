import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
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
  const session = await auth();
  if (session?.user?.id?.trim()) {
    redirect("/auth/continue");
  }

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
