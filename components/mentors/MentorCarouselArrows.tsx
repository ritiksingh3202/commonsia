"use client";

import { PaginationArrowLeft, PaginationArrowRight } from "@/components/icons/PaginationArrowIcons";
import { motion } from "framer-motion";

type Props = {
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
  ariaPrev?: string;
  ariaNext?: string;
};

/** Same arrow affordance as `MentorPagination` (outline circles + SVG arrows). */
export function MentorCarouselArrows({
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  ariaPrev = "Previous",
  ariaNext = "Next",
}: Props) {
  return (
    <div className="flex justify-center gap-1.5 sm:gap-2">
      <motion.button
        type="button"
        aria-label={ariaPrev}
        whileHover={{ x: -2 }}
        whileTap={{ scale: 0.95 }}
        disabled={prevDisabled}
        onClick={onPrev}
        className="flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-primary disabled:pointer-events-none disabled:opacity-30 sm:min-h-10 sm:min-w-10"
      >
        <PaginationArrowLeft className="icon-brand-line h-2.5 w-3.5" />
      </motion.button>
      <motion.button
        type="button"
        aria-label={ariaNext}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.95 }}
        disabled={nextDisabled}
        onClick={onNext}
        className="flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-primary disabled:pointer-events-none disabled:opacity-30 sm:min-h-10 sm:min-w-10"
      >
        <PaginationArrowRight className="icon-brand-line h-2.5 w-3.5" />
      </motion.button>
    </div>
  );
}
