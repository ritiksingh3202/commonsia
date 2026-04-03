import type { Metadata } from "next";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { MentorsPage } from "@/components/mentors/MentorsPage";

export const metadata: Metadata = {
  title: { absolute: "Mentors" },
};

export default function MentorsRoute() {
  return (
    <MarketingShell>
      <MentorsPage />
    </MarketingShell>
  );
}
