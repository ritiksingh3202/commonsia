/** Fast placeholder for public mentor profile while DB + reviews load. */
export default function PublicMentorLoading() {
  return (
    <div className="animate-pulse bg-white pb-10" aria-busy aria-label="Loading profile">
      <div className="h-40 w-full bg-neutral-200 sm:h-48 md:h-56" />
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:gap-10">
          <div className="mx-auto size-28 shrink-0 rounded-full bg-neutral-200 md:-mt-16 md:size-36" />
          <div className="min-w-0 flex-1 space-y-4 pt-2">
            <div className="h-9 max-w-md rounded-lg bg-neutral-200" />
            <div className="h-5 w-2/3 max-w-sm rounded bg-neutral-100" />
            <div className="h-24 max-w-2xl rounded-xl bg-neutral-50" />
          </div>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-neutral-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
