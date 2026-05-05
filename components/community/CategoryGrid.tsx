import Link from "next/link";

import { FORUM_CATEGORIES } from "@/lib/forum-categories";

function CategoryIcon({ slug, accent }: { slug: string; accent: string }) {
  switch (slug) {
    case "competitions":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M10 2l2.2 5H18l-4.5 3.5 1.8 5.5L10 13l-5.3 3 1.8-5.5L2 7h5.8L10 2Z"
            stroke={accent} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case "bachelors":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M10 3L19 7.5L10 12L1 7.5L10 3Z" stroke={accent} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M4.5 10.5v4c0 1.38 2.46 2.5 5.5 2.5s5.5-1.12 5.5-2.5v-4"
            stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "masters":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <rect x="2.5" y="3.5" width="15" height="13" rx="2" stroke={accent} strokeWidth="1.5" />
          <path d="M6 8.5h8M6 12h5" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "phd":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <circle cx="10" cy="8" r="4.5" stroke={accent} strokeWidth="1.5" />
          <path d="M7 13.5L5 19M13 13.5L15 19M7 19h6" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "faculty":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <rect x="1.5" y="7" width="17" height="11.5" rx="1.5" stroke={accent} strokeWidth="1.5" />
          <path d="M6.5 7V5.5a3.5 3.5 0 017 0V7" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M10 11v3M8.5 12.5h3" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "startup":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M10 2.5S14.5 5.5 14.5 10.5c0 2.5-2 4-4.5 4s-4.5-1.5-4.5-4C5.5 5.5 10 2.5 10 2.5Z"
            stroke={accent} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M6.5 14.5L4.5 18M13.5 14.5L15.5 18" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function CategoryGrid({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {FORUM_CATEGORIES.map((cat) => {
        const count = counts[cat.slug] ?? 0;
        return (
          <Link
            key={cat.slug}
            href={`/community/${cat.slug}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_32px_-8px_rgba(0,0,0,0.14)]"
          >
            {/* Accent top bar */}
            <span
              className="absolute inset-x-0 top-0 h-[3.5px]"
              style={{ backgroundColor: cat.accent }}
              aria-hidden
            />

            <div className="flex flex-1 flex-col gap-3 p-4 pt-5 sm:p-5 sm:pt-6">
              {/* Icon + count row */}
              <div className="flex items-center justify-between gap-2">
                <div
                  className="flex size-9 items-center justify-center rounded-xl sm:size-10"
                  style={{ backgroundColor: `${cat.accent}18` }}
                >
                  <CategoryIcon slug={cat.slug} accent={cat.accent} />
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[12px] font-bold tabular-nums text-white"
                  style={{ backgroundColor: cat.accent }}
                >
                  {count}
                </span>
              </div>

              {/* Label + degree tags + description */}
              <div>
                <p className="text-[14px] font-semibold leading-snug text-[#0a0a0a] sm:text-[15px]">
                  {cat.label}
                </p>
                {"degrees" in cat && cat.degrees && (
                  <p className="mt-0.5 text-[11px] font-medium text-primary sm:text-[12px]">
                    {cat.degrees}
                  </p>
                )}
                <p className="mt-1 text-[12px] leading-snug text-neutral-400 sm:text-[13px]">
                  {cat.description}
                </p>
              </div>

              {/* Competitions: free / paid hints */}
              {cat.slug === "competitions" && (
                <div className="mt-auto flex items-center gap-1.5 pt-1">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 sm:text-[11px]">
                    Free
                  </span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 sm:text-[11px]">
                    Paid
                  </span>
                  <span className="text-[10px] text-neutral-400">tagged</span>
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
