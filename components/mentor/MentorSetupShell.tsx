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

/** Four steps total: profile steps 1–3, then availability (`/mentor/availability`). */
export const MENTOR_SETUP_STEP_COUNT = 4;

function pctBarWidth(pct: number): string {
  return `${Math.min(100, Math.max(0, pct))}%`;
}

export function MentorSetupProgressHeader({
  percentComplete,
  stepCaption,
  heading = "Complete Your Mentor Profile",
  subheading = "Help students understand your expertise and mentoring style",
}: {
  /** Progress bar percent (0–100). Steps 1–3: stepN/total. Step 4 (availability): stay below 100 until final save. */
  percentComplete: number;
  /** Shown left of the bar (e.g. “Step 2 of 4”). */
  stepCaption: string;
  heading?: string;
  subheading?: string;
}) {
  const pct = Math.round(percentComplete);
  return (
    <>
      <div className="mb-5 space-y-2">
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <span className="text-[#4a5565]">{stepCaption}</span>
          <span className="font-medium text-primary">{pct}% Complete</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: pctBarWidth(pct) }}
          />
        </div>
      </div>

      <div className="mb-5 border-b border-black/5 pb-5">
        <h1 className="font-heading text-lg font-semibold tracking-tight text-[#0a0a0a] sm:text-xl">{heading}</h1>
        <p className="mt-1.5 text-[13px] leading-snug text-[#717182]">{subheading}</p>
      </div>
    </>
  );
}

export function MentorSetupShell({
  step,
  backHref,
  children,
}: {
  /** Wizard steps 1–3 (`/mentor/setup/*`). Step 4 is availability — see {@link MentorSetupProgressHeader} on `/mentor/availability`. */
  step: 1 | 2 | 3;
  backHref: string;
  children: React.ReactNode;
}) {
  const pct = Math.round((step / MENTOR_SETUP_STEP_COUNT) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50/25 to-white pb-16">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0a0a0a] transition-colors hover:text-primary"
        >
          <ChevronLeft className="size-3.5 shrink-0" />
          Back
        </Link>

        <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm sm:p-6 md:p-8">
          <MentorSetupProgressHeader
            percentComplete={pct}
            stepCaption={`Step ${step} of ${MENTOR_SETUP_STEP_COUNT}`}
          />

          {children}
        </div>
      </div>
    </div>
  );
}
