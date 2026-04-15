"use client";

import Link from "next/link";

/**
 * Shown when Neon/Postgres is unreachable so `/student` does not hard-error or mis-redirect to login.
 */
export function StudentDashboardDbUnavailable() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-lg font-semibold text-[#0a0a0a]">Could not load your dashboard</h1>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">
        The app could not reach the database server. This often happens briefly when the database wakes from
        sleep, or when the network is unstable.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-8 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
      >
        Try again
      </button>
      <Link href="/" className="mt-4 block text-sm font-medium text-primary hover:underline">
        Back to home
      </Link>
    </div>
  );
}
