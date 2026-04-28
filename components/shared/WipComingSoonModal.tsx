"use client";

import { useEffect } from "react";

export type WipComingSoonVariant = "discussion" | "opportunities";

const COPY: Record<
  WipComingSoonVariant,
  { title: string; body: string; badge: string }
> = {
  discussion: {
    badge: "Community",
    title: "We’re working on it",
    body: "Discussions and peer spaces aren’t live yet. We’re polishing the experience — you’ll be able to join the conversation here soon.",
  },
  opportunities: {
    badge: "Events & workshops",
    title: "We’re working on it",
    body: "Upcoming opportunities are almost ready. We’ll list events and workshops here when we go live — stay tuned.",
  },
};

type Props = {
  variant: WipComingSoonVariant | null;
  onClose: () => void;
};

export function WipComingSoonModal({ variant, onClose }: Props) {
  useEffect(() => {
    if (!variant) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [variant, onClose]);

  if (!variant) return null;

  const c = COPY[variant];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6" role="presentation">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[#0c0c0f]/50 backdrop-blur-[3px] transition-opacity"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wip-coming-soon-title"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_24px_80px_-20px_rgba(15,23,42,0.35)]"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 size-56 rounded-full bg-primary/[0.12] blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 size-48 rounded-full bg-sky-400/[0.15] blur-2xl" />

        <div className="relative px-6 pb-6 pt-8 sm:px-8 sm:pb-7 sm:pt-9">
          <div className="mx-auto flex size-[3.25rem] items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-sky-500/15 ring-1 ring-primary/20">
            <SparklesIcon className="size-7 text-primary" aria-hidden />
          </div>
          <p className="mt-5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/90">
            {c.badge}
          </p>
          <h2
            id="wip-coming-soon-title"
            className="mt-1.5 text-center text-xl font-semibold tracking-tight text-[#0a0a0a] sm:text-[1.35rem]"
          >
            {c.title}
          </h2>
          <p className="mt-3 text-center text-[14px] leading-relaxed text-[#5c5c66]">{c.body}</p>
          <p className="mt-4 text-center text-[13px] font-medium text-[#0a0a0a]">We’ll be live soon.</p>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-primary py-3 text-[14px] font-semibold text-white shadow-sm transition hover:bg-primary/92 active:scale-[0.99]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M12 3v2.5M12 18.5V21M5 5l1.8 1.8M17.2 17.2 19 19M3 12h2.5M18.5 12H21M5 19l1.8-1.8M17.2 6.8 19 5"
      />
      <path
        strokeWidth="1.75"
        strokeLinejoin="round"
        d="M12 8.5 13.5 12 12 15.5 10.5 12 12 8.5z"
      />
    </svg>
  );
}
