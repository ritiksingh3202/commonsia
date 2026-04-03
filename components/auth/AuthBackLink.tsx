import Link from "next/link";

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M12.5 15L7.5 10l5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AuthBackLink({ href = "/auth" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0a0a0a] transition-colors hover:text-primary"
    >
      <ChevronLeft className="size-3.5 shrink-0" />
      Back
    </Link>
  );
}
