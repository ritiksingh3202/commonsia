"use client";

import { motion } from "framer-motion";
import Image from "next/image";

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function MentorSearchBar({ value, onChange }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-2 sm:flex-row sm:items-stretch"
    >
      <label className="relative flex flex-1 items-center">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search mentors by skill, software, or topic"
          className="h-10 w-full rounded-full border border-cream bg-white py-2 pl-4 pr-11 text-xs text-[#1a1a1a] shadow-sm outline-none ring-primary/25 placeholder:text-neutral-400 focus:ring-2 sm:h-11 sm:pl-5 sm:text-sm"
        />
        <span className="pointer-events-none absolute right-3 flex size-7 items-center justify-center sm:right-4">
          <Image
            src="/mentors_assets/search.svg"
            alt=""
            width={18}
            height={18}
            className="icon-brand-line opacity-90"
          />
        </span>
      </label>
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-white sm:h-11 sm:px-5 sm:text-sm"
      >
        Filter
        <Image
          src="/dropdown.svg"
          alt=""
          width={22}
          height={22}
          className="size-[22px] object-contain brightness-0 invert"
        />
      </motion.button>
    </motion.div>
  );
}
