export default function CommunityLoading() {
  return (
    <div className="bg-[#fafafa] pb-16 pt-8 sm:pt-10" aria-busy aria-label="Loading community">
      <header className="mx-auto mb-6 max-w-2xl px-4 text-center sm:mb-8 sm:px-6">
        <div className="mx-auto h-7 w-32 animate-pulse rounded-md bg-neutral-200" />
        <div className="mx-auto mt-3 h-4 w-72 max-w-full animate-pulse rounded-md bg-neutral-100" />
      </header>
      <ul className="mx-auto flex max-w-2xl animate-pulse flex-col gap-5 px-4 sm:px-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
            <div className="flex items-center gap-3 px-5 pt-4">
              <div className="size-10 rounded-full bg-neutral-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 rounded bg-neutral-200" />
                <div className="h-3 w-20 rounded bg-neutral-100" />
              </div>
            </div>
            <div className="mt-3 h-48 bg-neutral-100" />
            <div className="space-y-2 px-5 pb-4 pt-3">
              <div className="h-3 w-full rounded bg-neutral-100" />
              <div className="h-3 w-3/4 rounded bg-neutral-100" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
