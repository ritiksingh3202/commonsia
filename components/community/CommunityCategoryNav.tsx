import Link from "next/link";

import { FORUM_CATEGORIES, type ForumCategorySlug } from "@/lib/forum-categories";

const TABS: Array<{ slug: ForumCategorySlug | null; label: string; href: string }> = [
  { slug: null, label: "All", href: "/community" },
  ...FORUM_CATEGORIES.map((c) => ({ slug: c.slug, label: c.label, href: `/community/${c.slug}` })),
];

export function CommunityCategoryNav({ active }: { active: ForumCategorySlug | null }) {
  return (
    <nav aria-label="Community categories" className="mx-auto max-w-4xl overflow-x-auto">
      <ul className="flex w-max min-w-full gap-1.5 px-4 sm:px-0">
        {TABS.map((t) => {
          const isActive = active === t.slug;
          const cat = FORUM_CATEGORIES.find((c) => c.slug === t.slug);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "inline-flex items-center whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-all",
                  isActive
                    ? "font-semibold text-white shadow-sm"
                    : "border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50",
                ].join(" ")}
                style={
                  isActive
                    ? { backgroundColor: cat?.accent ?? "#0a0a0a" }
                    : undefined
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
