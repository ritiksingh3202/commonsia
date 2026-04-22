/**
 * Lightweight loading shell shown by Next.js `loading.tsx` while an RSC streams in.
 * Keep it cheap (no heavy images / motion) so paint is truly instant even on slow connections.
 */
export function PageSkeleton({ kind = "page" }: { kind?: "page" | "dashboard" | "form" }) {
  if (kind === "dashboard") {
    return (
      <div className="mx-auto w-full max-w-6xl animate-pulse px-4 py-6 sm:px-6 sm:py-8 lg:px-8" aria-busy>
        <div className="mb-6 h-8 w-56 rounded bg-neutral-200" />
        <div className="mb-8 h-4 w-80 max-w-full rounded bg-neutral-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl border border-neutral-100 bg-neutral-50/90" />
          ))}
        </div>
      </div>
    );
  }

  if (kind === "form") {
    return (
      <div className="mx-auto w-full max-w-2xl animate-pulse px-4 py-8 sm:px-6 sm:py-10" aria-busy>
        <div className="mb-6 h-7 w-48 rounded bg-neutral-200" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 w-full rounded-md bg-neutral-100" />
          ))}
        </div>
        <div className="mt-6 h-10 w-40 rounded-md bg-neutral-200" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse px-4 py-10 sm:px-6 sm:py-12" aria-busy>
      <div className="mb-4 h-9 w-2/3 max-w-lg rounded bg-neutral-200" />
      <div className="mb-8 h-4 w-5/6 max-w-xl rounded bg-neutral-100" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 w-full rounded bg-neutral-100" />
        ))}
      </div>
    </div>
  );
}
