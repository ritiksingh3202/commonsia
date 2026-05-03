"use client";

import { useEffect } from "react";

export default function MentorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[mentor] dashboard render failed:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="font-heading text-xl font-semibold text-[#0a0a0a]">
        Couldn&apos;t load your dashboard
      </h2>
      <p className="text-sm leading-relaxed text-neutral-600">
        Something went wrong on our side. Please try again — if it keeps happening, check your
        connection or contact Commonsia support.
      </p>
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
