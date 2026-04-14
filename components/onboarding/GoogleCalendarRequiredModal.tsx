"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Variant = "student" | "mentor";

const copy: Record<Variant, { title: string; body: string; editHref: string; editLabel: string; returnPath: string }> = {
  student: {
    title: "Connect Google Calendar",
    body: "Commonsia needs Google Calendar so sessions can be added to your calendar and scheduling stays accurate. Connect now to continue using your dashboard.",
    editHref: "/student/profile/edit?tab=portfolio",
    editLabel: "Open profile settings",
    returnPath: "/student",
  },
  mentor: {
    title: "Connect Google Calendar",
    body: "Connect Google Calendar so students see your real availability and booked sessions appear on your calendar.",
    editHref: "/mentor/profile/edit?tab=profile",
    editLabel: "Open profile settings",
    returnPath: "/mentor",
  },
};

export function GoogleCalendarRequiredModal({
  googleCalendarConnected,
  variant,
}: {
  googleCalendarConnected: boolean;
  variant: Variant;
}) {
  const router = useRouter();
  const [dismissedThisVisit, setDismissedThisVisit] = useState(false);
  const cleanedUrl = useRef(false);

  const t = copy[variant];
  const authorizeHref = `/api/calendar/google/authorize?returnTo=${encodeURIComponent(t.returnPath)}`;

  useEffect(() => {
    if (typeof window === "undefined" || cleanedUrl.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar") === "connected") {
      cleanedUrl.current = true;
      params.delete("calendar");
      const q = params.toString();
      router.replace(q ? `${window.location.pathname}?${q}` : window.location.pathname);
      router.refresh();
    }
  }, [router]);

  const open = !googleCalendarConnected && !dismissedThisVisit;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[190] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-required-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-black/5 bg-white px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:px-8 sm:py-9"
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <IconCalendar className="size-7" />
            </div>
            <h2 id="calendar-required-title" className="text-center text-lg font-semibold text-[#0a0a0a] sm:text-xl">
              {t.title}
            </h2>
            <p className="mt-3 text-center text-sm leading-relaxed text-neutral-600">{t.body}</p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                href={authorizeHref}
                className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90"
              >
                Connect Google Calendar
              </Link>
              <Link
                href={t.editHref}
                className="flex w-full items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-[#0a0a0a] transition hover:bg-neutral-50"
              >
                {t.editLabel}
              </Link>
              <button
                type="button"
                onClick={() => setDismissedThisVisit(true)}
                className="mt-1 text-center text-xs font-medium text-neutral-500 underline-offset-2 hover:text-neutral-700 hover:underline"
              >
                I’ll connect later
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 7V5m8 2V5m-9 4h10M6 21h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
