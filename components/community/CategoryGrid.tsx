import Link from "next/link";

import { FORUM_CATEGORIES } from "@/lib/forum-categories";

/** Simple SVG icons for each category slug */
function CategoryIcon({ slug, accent }: { slug: string; accent: string }) {
  const cls = "shrink-0";
  switch (slug) {
    case "competitions":
      return (
        <svg className={cls} width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          <path d="M11 2L13.5 8H20L14.5 12L17 18L11 14L5 18L7.5 12L2 8H8.5L11 2Z" stroke={accent} strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "bachelors":
      return (
        <svg className={cls} width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          <path d="M11 3L21 8L11 13L1 8L11 3Z" stroke={accent} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M5 11v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "masters":
      return (
        <svg className={cls} width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          <rect x="3" y="4" width="16" height="14" rx="2" stroke={accent} strokeWidth="1.6" />
          <path d="M7 9h8M7 13h5" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "phd":
      return (
        <svg className={cls} width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          <circle cx="11" cy="9" r="5" stroke={accent} strokeWidth="1.6" />
          <path d="M8 14.5L6 20M14 14.5L16 20M8 20h6" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "faculty":
      return (
        <svg className={cls} width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          <rect x="2" y="7" width="18" height="13" rx="1.5" stroke={accent} strokeWidth="1.6" />
          <path d="M7 7V5a4 4 0 018 0v2" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M11 12v4M9 14h4" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "startup":
      return (
        <svg className={cls} width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          <path d="M11 3C11 3 15 6 15 11c0 2.21-1.79 4-4 4s-4-1.79-4-4c0-5 4-8 4-8Z" stroke={accent} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M7.5 15.5L5 19M14.5 15.5L17 19" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function CategoryGrid({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-widest text-neutral-400">
        Browse by Category
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {FORUM_CATEGORIES.map((cat) => {
          const count = counts[cat.slug] ?? 0;
          return (
            <Link
              key={cat.slug}
              href={`/community/${cat.slug}`}
              className="group relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md sm:p-5"
            >
              {/* Coloured top bar */}
              <span
                className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl"
                style={{ backgroundColor: cat.accent }}
                aria-hidden
              />

              <div className="flex items-start justify-between gap-2 pt-1">
                <CategoryIcon slug={cat.slug} accent={cat.accent} />
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white"
                  style={{ backgroundColor: cat.accent }}
                >
                  {count}
                </span>
              </div>

              <div>
                <p className="text-[14px] font-semibold text-[#0a0a0a] group-hover:text-[#1a1a1a] sm:text-[15px]">
                  {cat.label}
                </p>
                <p className="mt-0.5 text-[12px] leading-snug text-neutral-500 sm:text-[13px]">
                  {cat.description}
                </p>
              </div>

              {cat.slug === "competitions" && (
                <div className="mt-auto flex gap-1.5 pt-1">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Free
                  </span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    Paid
                  </span>
                  <span className="text-[10px] text-neutral-400">tagged</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
