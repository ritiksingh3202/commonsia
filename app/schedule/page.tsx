import type { Metadata } from "next";

import { MarketingShell } from "@/components/layout/MarketingShell";
import { ScheduleCallPage } from "@/components/schedule/ScheduleCallPage";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: { absolute: "Schedule a call" },
  description: "Pick a date and time for your mentoring call on Commonsia.",
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ mentorUserId?: string }>;
}) {
  const sp = await searchParams;
  const raw = sp.mentorUserId?.trim();
  let mentorUserId: string | null = null;
  let mentorDisplayName: string | null = null;
  if (raw) {
    const u = await prisma.user.findUnique({
      where: { id: raw },
      select: { name: true, role: true },
    });
    if (u?.role === "mentor") {
      mentorUserId = raw;
      mentorDisplayName = u.name ?? null;
    }
  }

  return (
    <MarketingShell>
      <ScheduleCallPage mentorUserId={mentorUserId} mentorDisplayName={mentorDisplayName} />
    </MarketingShell>
  );
}
