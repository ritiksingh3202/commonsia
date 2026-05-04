import Link from "next/link";

import { FORUM_CATEGORIES, type ForumCategorySlug } from "@/lib/forum-categories";

const TABS: Array<{ slug: ForumCategorySlug | null; label: string; href: string }> = [
  { slug: null, label: "All", href: "/community" },
  ...FORUM_CATEGORIES.map((c) => ({ slug: c.slug, label: c.label, href: `/community/${c.slug}` })),
];

export function CommunityCategoryNav({ active }: { active: ForumCategorySlug | null }) {
  return (
    <nav
      aria-label="Community categories"
      className="mx-auto mb-6 max-w-3xl overflow-x-auto"
    >
      <ul className="mx-auto flex w-max min-w-full justify-center gap-2 px-4 sm:px-0">
        {TABS.map((t) => {
          const isActive = active === t.slug;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "inline-flex items-center rounded-full bg-[#0a0a0a] px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm"
                    : "inline-flex items-center rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-[13px] font-medium text-neutral-700 transition hover:bg-neutral-50"
                }
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
