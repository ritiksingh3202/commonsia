import type { Metadata } from "next";
import { ChooseRolePage } from "@/components/auth/ChooseRolePage";
import { MarketingShell } from "@/components/layout/MarketingShell";

export const metadata: Metadata = {
  title: { absolute: "Choose role — Commonsia" },
  description: "Sign up or log in as a student or mentor on Commonsia.",
};

/** Entry from marketing CTAs (e.g. Join Commonsia) when the user is not signed in. */
export default function RoleSelectPage() {
  return (
    <MarketingShell>
      <div className="bg-white">
        <ChooseRolePage />
      </div>
    </MarketingShell>
  );
}
