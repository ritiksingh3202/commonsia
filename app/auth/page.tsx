import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ChooseRolePage } from "@/components/auth/ChooseRolePage";
import { MarketingShell } from "@/components/layout/MarketingShell";

export const metadata: Metadata = {
  title: { absolute: "Join" },
  description: "Sign up or log in as a student or mentor on Commonsia.",
};

export default async function AuthRolePage() {
  const session = await auth();
  if (session?.user?.id?.trim()) {
    redirect("/auth/continue");
  }

  return (
    <MarketingShell>
      <div className="bg-white">
        <ChooseRolePage />
      </div>
    </MarketingShell>
  );
}
