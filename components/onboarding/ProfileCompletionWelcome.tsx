"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

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

type Variant = "student" | "mentor";

const copy: Record<Variant, { title: string; subtitle: ReactNode; cta: string }> = {
  student: {
    title: "Welcome on board!",
    subtitle: (
      <>
        Your profile is complete — browse mentors, book a session, and keep building your{" "}
        <span className="font-medium text-primary">architecture</span> journey with the community.
      </>
    ),
    cta: "Let's go!",
  },
  mentor: {
    title: "Welcome on board!",
    subtitle: (
      <>
        Your <span className="font-medium text-primary">mentor</span> profile and availability are set — students can
        discover you. Head to your dashboard to manage sessions and messages.
      </>
    ),
    cta: "Let's go!",
  },
};

export function ProfileCompletionWelcome({ variant }: { variant: Variant }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const welcomeOn = searchParams.get("welcome") === "1";
  const open = welcomeOn && !dismissed;

  const pieces = useMemo(
    () =>
      Array.from({ length: 56 }, (_, i) => ({
        id: i,
        left: `${(i * 17 + (i % 7) * 13) % 100}%`,
        delay: (i % 12) * 0.04,
        duration: 2.2 + (i % 5) * 0.15,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + (i % 4) * 2,
        xDrift: ((i % 9) - 4) * 12,
      })),
    [],
  );

  const dismiss = () => {
    setDismissed(true);
    router.replace(variant === "student" ? "/student" : "/mentor");
  };

  const t = copy[variant];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-label="Close welcome dialog"
            onClick={dismiss}
          />

          {/* Confetti layer */}
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
                  x: [0, p.xDrift, p.xDrift * -0.5],
                  opacity: [0, 1, 1, 0.9, 0],
                  rotate: [0, 180 + p.id * 12],
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
            aria-labelledby="welcome-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-black/5 bg-white px-8 py-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
            initial={{ scale: 0.88, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <motion.div
              className="mx-auto mb-4 flex size-16 items-center justify-center text-5xl"
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.08 }}
              aria-hidden
            >
              🎉
            </motion.div>
            <h2
              id="welcome-title"
              className="font-heading text-2xl font-semibold tracking-tight text-[#0a0a0a] sm:text-[1.65rem]"
            >
              {t.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600 sm:text-[15px]">{t.subtitle}</p>
            <motion.button
              type="button"
              onClick={dismiss}
              className="mt-8 w-full rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98] sm:text-base"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {t.cta}
            </motion.button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
