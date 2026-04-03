import type { Metadata } from "next";
import { ContactPage } from "@/components/contact/ContactPage";
import { MarketingShell } from "@/components/layout/MarketingShell";

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
