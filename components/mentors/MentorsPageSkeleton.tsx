/** Shown while `/mentors` mentor list is loading (Suspense) — navbar/footer already visible. */
export function MentorsPageSkeleton() {
  return (
    <div className="animate-pulse bg-white pb-6 sm:pb-8" aria-busy aria-label="Loading mentors">
      <section className="relative overflow-hidden px-4 pb-4 pt-12 sm:px-6 sm:pb-6 sm:pt-16 lg:px-8 lg:pb-8 lg:pt-24">
        <div className="relative mx-auto w-full max-w-[100rem] px-3 sm:px-5 lg:px-10">
          <div className="relative z-20 mx-auto flex w-full min-w-0 max-w-2xl flex-col items-center space-y-4 px-1 sm:max-w-4xl sm:px-2 lg:max-w-5xl">
            <div className="h-11 w-full max-w-[min(100%,360px)] rounded-lg bg-neutral-200 sm:h-14 sm:max-w-[420px]" />
            <div className="h-3 w-48 rounded bg-neutral-100 sm:w-64" />
            <div className="h-10 w-full max-w-xl rounded-xl bg-neutral-100" />
            <div className="h-24 w-full max-w-2xl rounded-xl bg-neutral-50" />
          </div>
        </div>
      </section>
      <div className="mx-auto mt-6 w-full max-w-7xl px-4 sm:mt-8 sm:px-6 lg:px-8">
        <div className="mb-6 h-12 w-full max-w-2xl rounded-xl bg-neutral-100" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[280px] rounded-xl border border-neutral-100 bg-neutral-50/90 md:min-h-[300px]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
