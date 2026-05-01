"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type Props = {
  connected: boolean;
  /** Path only (e.g. /student/setup/3). Passed through OAuth state for post-consent redirect. */
  returnPath: string;
  description: string;
  /** When true, shows a “Required” badge (profile setup). */
  required?: boolean;
};

export function SetupGoogleCalendarConnect({ connected, returnPath, description, required }: Props) {
  const router = useRouter();
  const alerted = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || alerted.current) return;
    const c = new URLSearchParams(window.location.search).get("calendar");
    if (c === "connected") {
      alerted.current = true;
      window.alert("Google Calendar connected.");
      router.refresh();
    } else if (c === "error") {
      alerted.current = true;
      window.alert(
        "Could not connect Google Calendar. Try again or check GOOGLE_MEET_CLIENT_* (or login Google OAuth vars) and redirect URI in Google Cloud.",
      );
    }
  }, [router]);

  const href = `/api/calendar/google/authorize?returnTo=${encodeURIComponent(returnPath)}`;

  return (
    <div
      className={`rounded-xl border p-3.5 shadow-sm sm:p-4 ${
        connected ? "border-emerald-200/80 bg-emerald-50/40" : "border-black/[0.08] bg-white"
      }`}
    >
      <div className="mb-3 flex items-start gap-2.5 sm:gap-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-full sm:size-10 ${
            connected ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"
          }`}
        >
          {connected ? <IconCheck className="size-[1.125rem] sm:size-5" /> : <IconCalendar className="size-[1.125rem] sm:size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <h2 className="text-[13px] font-bold leading-tight text-[#0a0a0a] sm:text-sm">Google Calendar</h2>
            {required ? (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary sm:text-[11px]">
                Required
              </span>
            ) : null}
          </div>
          {connected ? (
            <p className="mt-1 text-[12px] font-medium leading-snug text-emerald-800 sm:text-[13px]">
              Connected — sessions can sync to your calendar.
            </p>
          ) : null}
          <p
            className={`text-[12px] leading-relaxed sm:text-[13px] sm:leading-snug ${connected ? "mt-1 text-[#6b7280]" : "mt-0.5 text-[#6b7280]"}`}
          >
            {description}
          </p>
        </div>
      </div>
      {connected ? (
        <div className="space-y-2">
          <p className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-2 py-2.5 text-center text-[12px] font-semibold leading-snug text-emerald-900 sm:px-3 sm:text-sm">
            Calendar connected
          </p>
          <Link
            href={href}
            className="flex min-h-[2.75rem] w-full touch-manipulation items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-[12px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 active:bg-neutral-100 sm:min-h-11 sm:text-[13px]"
          >
            <GoogleGlyph className="size-4 shrink-0 sm:size-5" />
            Update Google connection
          </Link>
        </div>
      ) : (
        <Link
          href={href}
          className="flex min-h-[2.75rem] w-full touch-manipulation items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-neutral-50 active:bg-neutral-100 sm:min-h-11 sm:text-sm"
        >
          <GoogleGlyph className="size-[1.125rem] shrink-0 sm:size-5" />
          Connect Google Calendar
        </Link>
      )}
    </div>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
