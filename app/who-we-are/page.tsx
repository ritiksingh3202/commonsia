import type { Metadata } from "next";

import { MarketingShell } from "@/components/layout/MarketingShell";
import { WhoWeArePage } from "@/components/who-we-are/WhoWeArePage";

export const metadata: Metadata = {
  title: { absolute: "Who We Are" },
  description:
    "The story behind Commonsia — from a thesis room to a platform connecting architecture students with verified mentors.",
};

/** Static marketing page — reasonable cache for fast TTFB. */
export const revalidate = 3600;

export default function WhoWeAreRoute() {
  return (
    <MarketingShell>
      <WhoWeArePage />
    </MarketingShell>
  );
}
