import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/layout/MarketingShell";

export const metadata: Metadata = {
  title: { absolute: "Schedule" },
};

export default function SchedulePage() {
  return (
    <MarketingShell>
    <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-heading-display max-w-2xl">Scheduling</h1>
      <p className="text-neutral-600">
        Booking will live here. For now, browse mentors and reach out through the
        platform once sessions are enabled.
      </p>
      <Link href="/mentors" className="text-primary underline">
        Back to mentors
      </Link>
    </div>
    </MarketingShell>
  );
}
