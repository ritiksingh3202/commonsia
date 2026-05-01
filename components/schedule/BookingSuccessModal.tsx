"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo } from "react";

const CONFETTI_COLORS = [
  "#ff6600",
  "#ff8533",
  "#e65c00",
  "#f97316",
  "#fb923c",
  "#a855f7",
  "#22c55e",
  "#eab308",
  "#38bdf8",
  "#f472b6",
];

const DEFAULT_AUTO_DISMISS_MS = 5_800;

export type BookingSuccessPayload = {
  /** When set to `request_submitted`, the student asked for a time — Commonsia confirms manually (no instant calendar book). */
  mode?: "booked" | "request_submitted";
  /** Shorter auto-close after mentor booking requests so redirect to profile feels snappy. */
  dismissAfterMs?: number;
  dateLine: string;
  timeLine: string;
  istHint: string | null;
  durationMin: number;
  calendarSynced: boolean;
  meetLink: string | null;
  softMessage: string | null;
};

export function BookingSuccessModal({
  open,
  payload,
  onClose,
}: {
  open: boolean;
  payload: BookingSuccessPayload | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open || !payload) return;
    const ms =
      typeof payload.dismissAfterMs === "number" && payload.dismissAfterMs > 0
        ? payload.dismissAfterMs
        : DEFAULT_AUTO_DISMISS_MS;
    const t = window.setTimeout(() => onClose(), ms);
    return () => window.clearTimeout(t);
  }, [open, payload, onClose]);

  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: `${(i * 19 + (i % 5) * 11) % 100}%`,
        delay: (i % 10) * 0.035,
        duration: 2 + (i % 5) * 0.12,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 5 + (i % 4) * 2,
        xDrift: ((i % 7) - 3) * 14,
      })),
    [],
  );

  useEffect(() => {
    if (!open || !payload) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, payload]);

  return (
    <AnimatePresence>
      {open && payload ? (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))] sm:items-center sm:pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pl-[max(1rem,env(safe-area-inset-left,0px))] sm:pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pt-[max(0.75rem,env(safe-area-inset-top,0px))] md:pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] md:pl-6 md:pr-6 md:pt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px] sm:backdrop-blur-[3px]"
            aria-label="Close"
            onClick={onClose}
          />

          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            {pieces.map((p) => (
              <motion.span
                key={p.id}
                className="absolute rounded-sm shadow-sm"
                style={{
                  left: p.left,
                  top: "-8%",
                  width: p.size,
                  height: p.size * 0.6,
                  backgroundColor: p.color,
                }}
                initial={{ y: 0, opacity: 0, rotate: 0, x: 0 }}
                animate={{
                  y: ["0vh", "110vh"],
                  x: [0, p.xDrift, p.xDrift * -0.45],
                  opacity: [0, 1, 1, 0.85, 0],
                  rotate: [0, 160 + p.id * 10],
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  ease: [0.22, 0.8, 0.28, 1],
                  repeat: 0,
                }}
              />
            ))}
          </div>

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-success-title"
            className="relative z-10 mx-auto w-full max-w-[min(100%,26rem)] rounded-t-2xl border border-black/[0.06] bg-white px-5 py-7 text-center shadow-[0_-12px_48px_rgba(0,0,0,0.14)] ring-1 ring-black/[0.03] sm:max-w-md sm:rounded-2xl sm:px-8 sm:py-9 sm:shadow-[0_24px_80px_rgba(0,0,0,0.16)] md:px-9 md:py-10"
            initial={{ scale: 0.88, opacity: 0, y: 22 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 14 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <motion.div
              className="mx-auto mb-2 flex size-[3.25rem] items-center justify-center text-[2.35rem] leading-none sm:mb-3 sm:size-[3.75rem] sm:text-[2.75rem]"
              initial={{ scale: 0, rotate: -18 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 17, delay: 0.06 }}
              aria-hidden
            >
              {"\u{1F389}"}
            </motion.div>
            <h2
              id="booking-success-title"
              className="font-heading text-[1.2rem] font-semibold leading-snug tracking-tight text-[#0a0a0a] sm:text-[1.35rem] md:text-2xl"
            >
              {payload.mode === "request_submitted" ? "Request sent" : "Your session is booked!"}
            </h2>
            <p className="mt-1.5 text-[13px] font-medium text-emerald-700 sm:mt-2 sm:text-sm md:text-[15px]">
              {payload.mode === "request_submitted"
                ? "We’ll email you when the mentor accepts or declines."
                : "You did it — see you there!"}
            </p>

            <div className="mt-5 rounded-xl bg-[#FFF8F1] px-3.5 py-3.5 text-left ring-1 ring-orange-100/80 sm:mt-6 sm:px-4 sm:py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary sm:text-[11px]">
                {payload.mode === "request_submitted" ? "Requested" : "When"}
              </p>
              <p className="mt-1 text-[0.9375rem] font-semibold leading-snug text-[#0a0a0a] sm:text-base">
                {payload.dateLine}
              </p>
              <p className="mt-1.5 text-[13px] font-medium leading-snug text-neutral-800 sm:text-sm">{payload.timeLine}</p>
              {payload.mode === "request_submitted" ? (
                <p className="mt-1 text-[11px] leading-snug text-neutral-500 sm:text-xs">
                  Time shown is the session that will be booked (first slice of the band you chose).
                </p>
              ) : null}
              {payload.istHint ? (
                <p className="mt-1 text-[11px] leading-snug text-neutral-500 sm:text-xs">{payload.istHint}</p>
              ) : null}
              <p className="mt-2 text-[12px] text-neutral-600 sm:text-[13px]">
                {payload.mode === "request_submitted" ? (
                  <>
                    Session length: <span className="tabular-nums">{payload.durationMin}</span> minutes (mentor confirms in
                    WhatsApp — Meet + Calendar follow)
                  </>
                ) : (
                  <>
                    <span className="tabular-nums">{payload.durationMin}</span> minutes
                  </>
                )}
              </p>
            </div>

            {payload.mode === "request_submitted" ? (
              <p className="mt-3.5 text-left text-[13px] leading-relaxed text-neutral-600 sm:mt-4 sm:text-sm">
                {payload.softMessage?.trim() ||
                  "This session time is on hold until the mentor accepts in WhatsApp. Check your inbox (and spam) for updates."}
              </p>
            ) : (
              <>
                <p className="mt-3.5 text-left text-[13px] leading-relaxed text-neutral-600 sm:mt-4 sm:text-sm">
                  If transactional email is configured for this site, Commonsia sends a confirmation to both you and
                  your mentor at your profile email addresses (in addition to any Google Calendar invites).
                </p>
                {payload.calendarSynced ? (
                  <p className="mt-2 text-left text-[13px] leading-relaxed text-neutral-600 sm:text-sm">
                    Google Calendar was updated — you may receive a calendar invite from Google as well. Check spam if
                    you don&apos;t see it.
                  </p>
                ) : (
                  <p className="mt-2 text-left text-[13px] leading-relaxed text-neutral-600 sm:text-sm">
                    {payload.softMessage?.trim() ||
                      "Connect Google Calendar on your dashboard to add this to your calendar and get Meet links by email when available."}
                  </p>
                )}
              </>
            )}

            {payload.mode !== "request_submitted" && payload.meetLink?.trim() ? (
              <a
                href={payload.meetLink.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-[2.75rem] w-full touch-manipulation items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90 active:bg-primary/95 sm:mt-5 sm:min-h-11 sm:text-[0.9375rem]"
              >
                Join Google Meet
              </a>
            ) : null}

            <motion.button
              type="button"
              onClick={onClose}
              className="mt-3 w-full touch-manipulation rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[#0a0a0a] shadow-sm transition hover:bg-neutral-50 active:bg-neutral-100 sm:mt-4 sm:min-h-[2.75rem] sm:px-6 sm:text-base"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Awesome!
            </motion.button>
            <p className="mt-2.5 text-[10px] leading-snug text-neutral-400 sm:mt-3 sm:text-[11px]">
              This message will close on its own in a few seconds.
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
