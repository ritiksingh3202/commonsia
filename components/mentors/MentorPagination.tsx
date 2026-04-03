"use client";

import { motion } from "framer-motion";
import Image from "next/image";

type Props = {
  page: number;
  total: number;
  onPageChange: (p: number) => void;
};

export function MentorPagination({ page, total, onPageChange }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2.5 sm:gap-2 sm:pt-3">
      <motion.button
        type="button"
        aria-label="Previous page"
        whileHover={{ x: -2 }}
        whileTap={{ scale: 0.95 }}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="flex size-8 items-center justify-center rounded-full border border-primary disabled:opacity-30 sm:size-9"
      >
        <Image src="/left_arrow.svg" alt="" width={12} height={10} className="h-2.5 w-3.5" />
      </motion.button>
      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
        <motion.button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          whileHover={{ scale: 1.06 }}
          className={`flex size-8 items-center justify-center rounded-full border text-xs font-semibold sm:size-9 sm:text-sm ${
            p === page
              ? "border-primary bg-primary text-white"
              : "border-primary text-primary"
          }`}
        >
          {p}
        </motion.button>
      ))}
      <motion.button
        type="button"
        aria-label="Next page"
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.95 }}
        disabled={page >= total}
        onClick={() => onPageChange(page + 1)}
        className="flex size-8 items-center justify-center rounded-full border border-primary disabled:opacity-30 sm:size-9"
      >
        <Image src="/right_arrow.svg" alt="" width={12} height={10} className="h-2.5 w-3.5" />
      </motion.button>
    </div>
  );
}
