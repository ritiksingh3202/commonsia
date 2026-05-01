"use client";

import { PaginationArrowLeft, PaginationArrowRight } from "@/components/icons/PaginationArrowIcons";
import { motion } from "framer-motion";
import { useMemo } from "react";

type Props = {
  page: number;
  total: number;
  onPageChange: (p: number) => void;
};

/** Compact page list: avoids dozens of buttons on small screens and long mentor lists. */
function buildPageWindow(total: number, current: number): ("ellipsis" | number)[] {
  if (total <= 1) return [1];
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const want = new Set<number>();
  want.add(1);
  want.add(total);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= total) want.add(i);
  }

  const sorted = [...want].sort((a, b) => a - b);
  const out: ("ellipsis" | number)[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i];
    if (i > 0 && n - sorted[i - 1] > 1) {
      out.push("ellipsis");
    }
    out.push(n);
  }
  return out;
}

export function MentorPagination({ page, total, onPageChange }: Props) {
  const items = useMemo(() => buildPageWindow(total, page), [total, page]);

  return (
    <nav
      className="flex max-w-full flex-wrap items-center justify-center gap-1.5 pt-3 sm:gap-2 sm:pt-4"
      aria-label="Pagination"
    >
      <motion.button
        type="button"
        aria-label="Previous page"
        whileHover={{ x: -2 }}
        whileTap={{ scale: 0.95 }}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-primary disabled:pointer-events-none disabled:opacity-30 sm:min-h-10 sm:min-w-10"
      >
        <PaginationArrowLeft className="icon-brand-line h-2.5 w-3.5" />
      </motion.button>

      <div className="flex max-w-[min(100%,20rem)] flex-wrap items-center justify-center gap-1.5 sm:max-w-none sm:gap-2">
        {items.map((item, idx) =>
          item === "ellipsis" ? (
            <span
              key={`e-${idx}`}
              className="flex min-w-8 items-center justify-center px-0.5 text-xs font-semibold text-neutral-400"
              aria-hidden
            >
              …
            </span>
          ) : (
            <motion.button
              key={item}
              type="button"
              aria-label={`Page ${item}`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => onPageChange(item)}
              whileHover={{ scale: 1.06 }}
              className={`flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border text-xs font-semibold sm:min-h-10 sm:min-w-10 sm:text-sm ${
                item === page
                  ? "border-primary bg-primary text-white"
                  : "border-primary text-primary"
              }`}
            >
              {item}
            </motion.button>
          ),
        )}
      </div>

      <motion.button
        type="button"
        aria-label="Next page"
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.95 }}
        disabled={page >= total}
        onClick={() => onPageChange(page + 1)}
        className="flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-primary disabled:pointer-events-none disabled:opacity-30 sm:min-h-10 sm:min-w-10"
      >
        <PaginationArrowRight className="icon-brand-line h-2.5 w-3.5" />
      </motion.button>
    </nav>
  );
}
