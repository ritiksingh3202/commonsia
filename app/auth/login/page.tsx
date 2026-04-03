import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { MarketingShell } from "@/components/layout/MarketingShell";

export const metadata: Metadata = {
  title: { absolute: "Sign in" },
  description: "Sign in to your Commonsia account.",
};

export default function LoginPage() {
  return (
    <MarketingShell>
      <div className="bg-white">
        <LoginForm />
      </div>
    </MarketingShell>
  );
}
