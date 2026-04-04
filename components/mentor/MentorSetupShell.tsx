import Link from "next/link";

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M12.5 15L7.5 10l5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const steps = [
  { label: "Step 1 of 3", pct: 33, bar: "33%" },
  { label: "Step 2 of 3", pct: 67, bar: "67%" },
  { label: "Step 3 of 3", pct: 100, bar: "100%" },
] as const;

export function MentorSetupShell({
  step,
  backHref,
  children,
}: {
  step: 1 | 2 | 3;
  backHref: string;
  children: React.ReactNode;
}) {
  const s = steps[step - 1];

  return (
    <div className="mx-auto w-full max-w-[480px] px-4 py-5 sm:py-7">
      <Link
        href={backHref}
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0a0a0a] transition-colors hover:text-primary"
      >
        <ChevronLeft className="size-3.5 shrink-0" />
        Back
      </Link>

      <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm sm:p-5 md:p-6">
        <div className="mb-5 space-y-2">
          <div className="flex items-center justify-between gap-2 text-[13px]">
            <span className="text-[#4a5565]">{s.label}</span>
            <span className="font-medium text-primary">{s.pct}% Complete</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: s.bar }}
            />
          </div>
        </div>

        <div className="mb-5 border-b border-black/5 pb-5">
          <h1 className="font-heading text-lg font-semibold tracking-tight text-[#0a0a0a] sm:text-xl">
            Complete Your Mentor Profile
          </h1>
          <p className="mt-1.5 text-[13px] leading-snug text-[#717182]">
            Help students understand your expertise and mentoring style
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
