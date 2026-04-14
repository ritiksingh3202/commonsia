import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { ScheduleCallPage } from "@/components/schedule/ScheduleCallPage";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: { absolute: "Book a session" },
  description: "Pick a date and time for your mentoring session on Commonsia.",
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ mentorUserId?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    const q = new URLSearchParams();
    const raw = sp.mentorUserId?.trim();
    if (raw) q.set("mentorUserId", raw);
    const path = q.toString() ? `/schedule?${q.toString()}` : "/schedule";
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(path)}`);
  }

  const raw = sp.mentorUserId?.trim();
  let mentorUserId: string | null = null;
  let mentorDisplayName: string | null = null;
  let mentorAvailabilityJson: unknown = null;
  if (raw) {
    const u = await prisma.user.findUnique({
      where: { id: raw },
      select: { name: true, role: true, mentorAvailabilityJson: true },
    });
    if (u?.role === "mentor") {
      mentorUserId = raw;
      mentorDisplayName = u.name ?? null;
      mentorAvailabilityJson = u.mentorAvailabilityJson ?? null;
    }
  }

  return (
    <MarketingShell>
      <ScheduleCallPage
        mentorUserId={mentorUserId}
        mentorDisplayName={mentorDisplayName}
        mentorAvailabilityJson={mentorAvailabilityJson}
      />
    </MarketingShell>
  );
}
