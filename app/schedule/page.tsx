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

/** Always read latest mentor availability from DB (pairs with client `router.refresh()`). */
export const dynamic = "force-dynamic";

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

  let initialHasPendingSessionRequest = false;
  if (mentorUserId && session.user.id) {
    let isStudent = session.user.role === "student";
    if (!session.user.role) {
      const viewer = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });
      isStudent = viewer?.role === "student";
    }
    if (isStudent) {
      const pending = await prisma.bookingRequest.findFirst({
        where: { studentId: session.user.id, mentorId: mentorUserId, status: "pending" },
        select: { id: true },
      });
      initialHasPendingSessionRequest = Boolean(pending);
    }
  }

  return (
    <MarketingShell>
      <ScheduleCallPage
        mentorUserId={mentorUserId}
        mentorDisplayName={mentorDisplayName}
        mentorAvailabilityJson={mentorAvailabilityJson}
        initialHasPendingSessionRequest={initialHasPendingSessionRequest}
      />
    </MarketingShell>
  );
}
