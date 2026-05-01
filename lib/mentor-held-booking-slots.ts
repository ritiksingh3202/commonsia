import type { PrismaClient } from "@prisma/client";

import type { BookableSlotSegment } from "@/lib/booking-availability-slots";

export type HeldIntervalMs = { startMs: number; endMs: number };

/** Pending requests hold an entire availability band; confirmed bookings hold exact session intervals. */
export type MentorHeldIntervals = {
  pendingFullWindows: HeldIntervalMs[];
  confirmedSessions: HeldIntervalMs[];
};

function intervalsOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && b0 < a1;
}

/**
 * Loads mentor intervals that block public scheduling:
 * - **BookingRequest** (`pending` / `awaiting_slot` / `accepted` before catalog completes): entire `[startAt,endAt]` window is reserved.
 * - **MentoringBooking**: confirmed sessions at exact `[startAt,endAt]`.
 */
export async function loadMentorHeldIntervals(
  prisma: PrismaClient,
  mentorId: string,
  horizonStart: Date = new Date(),
  opts?: { excludeBookingRequestId?: string },
): Promise<MentorHeldIntervals> {
  const since = new Date(horizonStart.getTime() - 2 * 60 * 60_000);
  const excludeId = opts?.excludeBookingRequestId?.trim();
  const [requests, bookings] = await Promise.all([
    prisma.bookingRequest.findMany({
      where: {
        mentorId,
        status: { in: ["pending", "accepted", "awaiting_slot"] },
        startAt: { gte: since },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { startAt: true, endAt: true },
    }),
    prisma.mentoringBooking.findMany({
      where: { mentorId, startAt: { gte: since } },
      select: { startAt: true, endAt: true },
    }),
  ]);

  const pendingFullWindows: HeldIntervalMs[] = requests.map((r) => ({
    startMs: r.startAt.getTime(),
    endMs: r.endAt.getTime(),
  }));
  const confirmedSessions: HeldIntervalMs[] = bookings.map((b) => ({
    startMs: b.startAt.getTime(),
    endMs: b.endAt.getTime(),
  }));

  return { pendingFullWindows, confirmedSessions };
}

/** Flattened list — use when any overlap with `[start,end)` blocks (e.g. catalog granular picks). */
export async function loadMentorHeldSessionIntervals(
  prisma: PrismaClient,
  mentorId: string,
  horizonStart: Date = new Date(),
  opts?: { excludeBookingRequestId?: string },
): Promise<HeldIntervalMs[]> {
  const { pendingFullWindows, confirmedSessions } = await loadMentorHeldIntervals(
    prisma,
    mentorId,
    horizonStart,
    opts,
  );
  return [...pendingFullWindows, ...confirmedSessions];
}

/**
 * Drops availability windows already claimed by another pending request (whole-band overlap).
 * Confirmed bookings hide a band only when a session starting at the band's **first** instant would overlap
 * (legacy heuristic — avoids hiding a long band because a short session sits in the middle).
 */
export function filterSlotsAgainstHeldIntervals(
  slots: BookableSlotSegment[],
  sessionDurationMinutes: number,
  held: MentorHeldIntervals,
): BookableSlotSegment[] {
  if (slots.length === 0) return slots;
  const durMs = sessionDurationMinutes * 60_000;
  const { pendingFullWindows, confirmedSessions } = held;

  return slots.filter((slot) => {
    const ws = new Date(slot.startISO).getTime();
    const we = new Date(slot.endISO).getTime();
    if (pendingFullWindows.some((h) => intervalsOverlap(ws, we, h.startMs, h.endMs))) return false;

    const sessStart = ws;
    const sessEnd = sessStart + durMs;
    if (confirmedSessions.some((h) => intervalsOverlap(sessStart, sessEnd, h.startMs, h.endMs))) return false;
    return true;
  });
}

/** True when [startMs, endMs) overlaps any held mentor interval (bookings / in-flight requests). */
export function sessionIntervalOverlapsHeld(startMs: number, endMs: number, held: HeldIntervalMs[]): boolean {
  return held.some((h) => intervalsOverlap(startMs, endMs, h.startMs, h.endMs));
}
