"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo } from "react";

const CONFETTI_COLORS = [
  "#ff571f",
  "#f16422",
  "#ea580c",
  "#f97316",
  "#fb923c",
  "#a855f7",
  "#22c55e",
  "#eab308",
  "#38bdf8",
  "#f472b6",
];

const AUTO_DISMISS_MS = 5_800;

export type BookingSuccessPayload = {
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
    const t = window.setTimeout(() => onClose(), AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [open, payload, onClose]);

  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
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

  return (
    <AnimatePresence>
      {open && payload ? (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
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
            className="relative z-10 w-full max-w-md rounded-2xl border border-black/5 bg-white px-7 py-9 text-center shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:px-9 sm:py-10"
            initial={{ scale: 0.88, opacity: 0, y: 22 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 14 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <motion.div
              className="mx-auto mb-3 flex size-[3.75rem] items-center justify-center text-[2.75rem] leading-none"
              initial={{ scale: 0, rotate: -18 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 17, delay: 0.06 }}
              aria-hidden
            >
              {"\u{1F389}"}
            </motion.div>
            <h2
              id="booking-success-title"
              className="font-heading text-[1.35rem] font-semibold tracking-tight text-[#0a0a0a] sm:text-2xl"
            >
              Your session is booked!
            </h2>
            <p className="mt-2 text-sm font-medium text-emerald-700 sm:text-[15px]">You did it — see you there!</p>

            <div className="mt-6 rounded-xl bg-[#FFF8F1] px-4 py-4 text-left ring-1 ring-orange-100/80">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">When</p>
              <p className="mt-1 text-[15px] font-semibold text-[#0a0a0a] sm:text-base">{payload.dateLine}</p>
              <p className="mt-1.5 text-sm font-medium text-neutral-800">{payload.timeLine}</p>
              {payload.istHint ? (
                <p className="mt-1 text-[12px] text-neutral-500">{payload.istHint}</p>
              ) : null}
              <p className="mt-2 text-[13px] text-neutral-600">
                <span className="tabular-nums">{payload.durationMin}</span> minutes
              </p>
            </div>

            {payload.calendarSynced ? (
              <p className="mt-4 text-sm leading-relaxed text-neutral-600">
                We&apos;ve synced with Google Calendar. You should get an invite by email shortly — check spam if you
                don&apos;t see it.
              </p>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-neutral-600">
                {payload.softMessage?.trim() ||
                  "Session saved on Commonsia. Connect Google Calendar on your dashboard to add it to your calendar and get Meet links by email."}
              </p>
            )}

            {payload.meetLink?.trim() ? (
              <a
                href={payload.meetLink.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-white shadow-md transition hover:bg-primary/90"
              >
                Join Google Meet
              </a>
            ) : null}

            <motion.button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-[#0a0a0a] shadow-sm transition hover:bg-neutral-50 sm:text-base"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Awesome!
            </motion.button>
            <p className="mt-3 text-[11px] text-neutral-400">This message will close on its own in a few seconds.</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
