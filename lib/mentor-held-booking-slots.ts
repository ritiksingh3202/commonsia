import type { PrismaClient } from "@prisma/client";

import type { BookableSlotSegment } from "@/lib/booking-availability-slots";

export type HeldIntervalMs = { startMs: number; endMs: number };

/** Pending requests reserve their persisted `[startAt,endAt]` session slice; confirmed bookings use the same shape. */
export type MentorHeldIntervals = {
  pendingRequestIntervals: HeldIntervalMs[];
  confirmedSessions: HeldIntervalMs[];
};

function intervalsOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && b0 < a1;
}

/**
 * Loads mentor intervals that block public scheduling:
 * - **BookingRequest** (`pending` / `awaiting_slot` / `accepted`): `[startAt,endAt]` on the row (first session slice the student locked in, not the full UI band).
 * - **MentoringBooking**: confirmed sessions at `[startAt,endAt]`.
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

  const pendingRequestIntervals: HeldIntervalMs[] = requests.map((r) => ({
    startMs: r.startAt.getTime(),
    endMs: r.endAt.getTime(),
  }));
  const confirmedSessions: HeldIntervalMs[] = bookings.map((b) => ({
    startMs: b.startAt.getTime(),
    endMs: b.endAt.getTime(),
  }));

  return { pendingRequestIntervals, confirmedSessions };
}

/** Flattened list — use when any overlap with `[start,end)` blocks (e.g. catalog granular picks). */
export async function loadMentorHeldSessionIntervals(
  prisma: PrismaClient,
  mentorId: string,
  horizonStart: Date = new Date(),
  opts?: { excludeBookingRequestId?: string },
): Promise<HeldIntervalMs[]> {
  const { pendingRequestIntervals, confirmedSessions } = await loadMentorHeldIntervals(
    prisma,
    mentorId,
    horizonStart,
    opts,
  );
  return [...pendingRequestIntervals, ...confirmedSessions];
}

/**
 * Drops availability segments that overlap another pending request’s persisted `[startAt,endAt]` slice (or any confirmed session).
 * Confirmed bookings apply an extra heuristic: only sessions starting at the band’s **first** instant can hide the segment.
 */
export function filterSlotsAgainstHeldIntervals(
  slots: BookableSlotSegment[],
  sessionDurationMinutes: number,
  held: MentorHeldIntervals,
): BookableSlotSegment[] {
  if (slots.length === 0) return slots;
  const durMs = sessionDurationMinutes * 60_000;
  const { pendingRequestIntervals, confirmedSessions } = held;

  return slots.filter((slot) => {
    const ws = new Date(slot.startISO).getTime();
    const we = new Date(slot.endISO).getTime();
    if (pendingRequestIntervals.some((h) => intervalsOverlap(ws, we, h.startMs, h.endMs))) return false;

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
