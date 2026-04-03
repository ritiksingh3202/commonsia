import type { Metadata } from "next";
import { ChooseRolePage } from "@/components/auth/ChooseRolePage";
import { MarketingShell } from "@/components/layout/MarketingShell";

export const metadata: Metadata = {
  title: { absolute: "Join" },
  description: "Sign up or log in as a student or mentor on Commonsia.",
};

export default function AuthRolePage() {
  return (
    <MarketingShell>
      <div className="bg-white">
        <ChooseRolePage />
      </div>
    </MarketingShell>
  );
}
