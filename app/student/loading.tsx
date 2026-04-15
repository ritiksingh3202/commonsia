/** Shown immediately on /student navigation while auth + dashboard data load. */
export default function StudentHomeLoading() {
  return (
    <div className="animate-pulse px-4 py-9 sm:px-6 lg:px-10" aria-busy aria-label="Loading dashboard">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 border-b border-black/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-lg bg-neutral-200 sm:h-8 sm:w-56" />
            <div className="h-4 w-full max-w-md rounded bg-neutral-100" />
          </div>
          <div className="h-4 w-24 rounded bg-neutral-100" />
        </div>
        <div className="mb-8 mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[118px] rounded-xl border border-neutral-100 bg-neutral-50/90" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="h-72 rounded-xl bg-neutral-100" />
          <div className="space-y-6">
            <div className="h-40 rounded-xl bg-neutral-50" />
            <div className="h-48 rounded-xl bg-neutral-50" />
          </div>
        </div>
      </div>
    </div>
  );
}
