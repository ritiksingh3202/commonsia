"use client";

import { motion } from "framer-motion";
import Image from "next/image";

type Props = {
  value: string;
  onChange: (v: string) => void;
  className?: string;
};

export function MentorSearchBar({ value, onChange, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={className ?? "w-full min-w-0"}
    >
      <label className="relative flex w-full min-w-0 items-center">
        <span className="sr-only">Search mentors</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search mentors by skill, software, or topic"
          enterKeyHint="search"
          autoComplete="off"
          type="search"
          className="min-h-12 w-full min-w-0 rounded-full border border-black/[0.08] bg-white py-3 pl-6 pr-12 text-base text-[#1a1a1a] shadow-sm outline-none ring-primary/25 placeholder:text-neutral-400 focus:ring-2 sm:text-sm"
        />
        <span className="pointer-events-none absolute right-4 flex size-7 items-center justify-center">
          <Image
            src="/mentors_assets/search.svg"
            alt=""
            width={18}
            height={18}
            sizes="18px"
            className="icon-brand-line opacity-90"
          />
        </span>
      </label>
    </motion.div>
  );
}
