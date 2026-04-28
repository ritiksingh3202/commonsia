import type { PrismaClient } from "@prisma/client";

import type { BookableSlotSegment } from "@/lib/booking-availability-slots";

export type HeldIntervalMs = { startMs: number; endMs: number };

function intervalsOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && b0 < a1;
}

/**
 * Session starts that are already held by another student's pending/accepted request or a
 * confirmed {@link MentoringBooking} — used to hide those starts from the public slot list.
 */
export async function loadMentorHeldSessionIntervals(
  prisma: PrismaClient,
  mentorId: string,
  horizonStart: Date = new Date(),
): Promise<HeldIntervalMs[]> {
  const since = new Date(horizonStart.getTime() - 2 * 60 * 60_000);
  const [requests, bookings] = await Promise.all([
    prisma.bookingRequest.findMany({
      where: {
        mentorId,
        status: { in: ["pending", "accepted"] },
        startAt: { gte: since },
      },
      select: { startAt: true, endAt: true },
    }),
    prisma.mentoringBooking.findMany({
      where: { mentorId, startAt: { gte: since } },
      select: { startAt: true, endAt: true },
    }),
  ]);
  const out: HeldIntervalMs[] = [];
  for (const r of requests) {
    out.push({ startMs: r.startAt.getTime(), endMs: r.endAt.getTime() });
  }
  for (const b of bookings) {
    out.push({ startMs: b.startAt.getTime(), endMs: b.endAt.getTime() });
  }
  return out;
}

/** Drop bookable rows whose session [startISO, startISO + duration) overlaps any held interval. */
export function filterSlotsAgainstHeldIntervals(
  slots: BookableSlotSegment[],
  sessionDurationMinutes: number,
  held: HeldIntervalMs[],
): BookableSlotSegment[] {
  if (held.length === 0 || slots.length === 0) return slots;
  const durMs = sessionDurationMinutes * 60_000;
  return slots.filter((slot) => {
    const s = new Date(slot.startISO).getTime();
    const e = s + durMs;
    return !held.some((h) => intervalsOverlap(s, e, h.startMs, h.endMs));
  });
}
