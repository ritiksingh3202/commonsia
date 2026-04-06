import type { Metadata } from "next";

import { MarketingShell } from "@/components/layout/MarketingShell";
import { ScheduleCallPage } from "@/components/schedule/ScheduleCallPage";

export const metadata: Metadata = {
  title: { absolute: "Schedule a call" },
  description: "Pick a date and time for your mentoring call on Commonsia.",
};

export default function SchedulePage() {
  return (
    <MarketingShell>
      <ScheduleCallPage />
    </MarketingShell>
  );
}
