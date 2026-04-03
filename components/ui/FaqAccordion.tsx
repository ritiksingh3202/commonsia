"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

export type FaqItem = { q: string; a: string };

export function FaqAccordion({
  items,
  className,
}: {
  items: readonly FaqItem[];
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className={className}>
      <ul className="flex flex-col gap-[27px]">
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <li key={item.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-3 rounded-[14px] border border-neutral-200/90 bg-white px-4 py-3.5 text-left shadow-sm transition-colors hover:border-primary/35 sm:gap-4 sm:rounded-[17px] sm:px-6 sm:py-4"
              >
                <span className="font-semibold text-[15px] leading-snug text-black sm:text-lg">
                  {item.q}
                </span>
                <motion.span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-normal leading-none text-primary"
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.25 }}
                >
                  +
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-3 pt-0 text-left text-sm leading-relaxed text-neutral-700 sm:px-6 sm:text-[15px]">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
