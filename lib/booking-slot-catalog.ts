/**
 * Helpers for a future two-step WhatsApp flow (mentor picks exact start inside the student’s window).
 * Zixflow “catalog” templates still need dashboard wiring + signed URLs per option.
 */

/**
 * Candidate session start times every `slotStepMinutes`, such that the session still fits inside the window.
 * Example: window 2–4 PM, 60‑minute sessions, 15‑minute steps → 2:00, 2:15, 2:30, 3:00, 3:15, 3:30 (last start 3:30).
 */
export function granularSessionStartsWithinWindow(
  windowStart: Date,
  windowEnd: Date,
  sessionDurationMinutes: number,
  slotStepMinutes: number,
): Date[] {
  const durMs = Math.max(5, sessionDurationMinutes) * 60_000;
  const stepMs = Math.max(5, slotStepMinutes) * 60_000;
  const lastStartMs = windowEnd.getTime() - durMs;
  const out: Date[] = [];
  for (let t = windowStart.getTime(); t <= lastStartMs + 1; t += stepMs) {
    out.push(new Date(t));
  }
  return out;
}
