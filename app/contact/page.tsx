import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { MarketingShell } from "@/components/layout/MarketingShell";

const ContactPage = dynamic(
  () => import("@/components/contact/ContactPage").then((m) => m.ContactPage),
  {
    loading: () => (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-16 sm:px-6">
        <div className="h-10 w-52 animate-pulse rounded-lg bg-neutral-200" />
        <div className="h-44 animate-pulse rounded-xl bg-neutral-100" />
        <div className="h-32 animate-pulse rounded-xl bg-neutral-100" />
      </div>
    ),
  },
);

export const metadata: Metadata = {
  title: { absolute: "Contact" },
};

export default function ContactRoute() {
  return (
    <MarketingShell>
      <ContactPage />
    </MarketingShell>
  );
}
