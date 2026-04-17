"use client";

import { useEffect } from "react";

type Variant = "mentor" | "student";

const copy: Record<Variant, { title: string; body: string }> = {
  mentor: {
    title: "Setup is required",
    body: "Completing your mentor profile and your availability is compulsory on Commonsia. You need to finish both before we allow access to your mentor dashboard. Please stay on this flow and complete every required step.",
  },
  student: {
    title: "Profile setup is required",
    body: "Completing your student profile is compulsory on Commonsia. You need to finish your profile before we allow access to your student dashboard. Please stay on this flow and complete every required step.",
  },
};

export function MandatorySetupReminderModal({
  open,
  variant,
  onDismiss,
}: {
  open: boolean;
  variant: Variant;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  const c = copy[variant];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))] backdrop-blur-[2px] sm:items-center sm:pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pl-[max(1rem,env(safe-area-inset-left,0px))] sm:pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:backdrop-blur-[3px] md:pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] md:pl-6 md:pr-6 md:pt-6"
      role="presentation"
    >
      <div
        className="w-full max-w-[min(100%,26rem)] max-h-[min(88dvh,34rem)] overflow-y-auto overscroll-y-contain rounded-t-2xl border border-black/[0.07] bg-white px-5 py-6 shadow-[0_-8px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] sm:max-h-[min(92dvh,36rem)] sm:rounded-2xl sm:px-6 sm:py-7 sm:shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mandatory-setup-title"
      >
        <h2
          id="mandatory-setup-title"
          className="text-[1.05rem] font-semibold leading-snug tracking-tight text-[#0a0a0a] sm:text-lg md:text-xl"
        >
          {c.title}
        </h2>
        <p className="mt-3 max-w-prose text-[13px] leading-relaxed text-neutral-600 sm:mt-3.5 sm:text-sm md:text-[0.9375rem] md:leading-relaxed">
          {c.body}
        </p>
        <div className="mt-6 flex justify-stretch sm:mt-7 sm:justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex min-h-[2.75rem] w-full touch-manipulation items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90 active:bg-primary/95 sm:min-h-[3rem] sm:w-auto sm:px-6 sm:text-[0.9375rem]"
          >
            Got it, continue setup
          </button>
        </div>
      </div>
    </div>
  );
}
