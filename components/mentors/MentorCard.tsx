"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Mentor } from "@/lib/mentors-data";

export function MentorCard({
  mentor,
  index,
}: {
  mentor: Mentor;
  index: number;
}) {
  const router = useRouter();
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{
        y: -4,
        boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
        transition: { duration: 0.2 },
      }}
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/mentors/${mentor.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/mentors/${mentor.id}`);
        }
      }}
      className="grid min-h-0 cursor-pointer grid-cols-1 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(0,34%)]"
    >
      <div className="order-1 flex flex-col justify-between gap-1.5 p-3 sm:gap-2 sm:p-3.5 md:order-1 md:max-w-none md:pr-3 md:py-3">
        <div>
          <h3 className="text-sm font-semibold leading-tight text-[#1a1a1a] sm:text-[15px]">
            {mentor.name}
          </h3>
          <p className="mt-0.5 text-[10px] font-semibold text-neutral-600 sm:text-[11px]">
            {mentor.role}
          </p>
        </div>
        <p className="text-[11px] leading-snug text-[#1a1a1a] sm:text-xs">
          {mentor.shortBio}
        </p>
        <p className="text-[11px] leading-snug text-neutral-700 sm:text-xs">
          {mentor.detail}
        </p>
        <div className="flex flex-wrap gap-1">
          {mentor.tags.map((t) => (
            <span
              key={t}
              className="rounded bg-primary px-1.5 py-px text-[9px] font-semibold text-white sm:text-[10px]"
            >
              {t}
            </span>
          ))}
        </div>
        <p className="text-[9px] font-semibold leading-snug text-neutral-800 sm:text-[10px]">
          {mentor.slot}
        </p>
        <Link
          href="/schedule"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex w-fit items-center justify-center rounded-full bg-primary px-3 py-1.5 text-[10px] font-semibold text-white transition-transform hover:scale-[1.02] sm:px-4 sm:py-2 sm:text-[11px]"
        >
          Schedule A Call
        </Link>
      </div>
      <div className="relative order-2 min-h-[160px] w-full md:order-2 md:min-h-[168px]">
        <Image
          src={mentor.image}
          alt={mentor.name}
          fill
          className="object-cover object-center md:rounded-r-xl"
          sizes="(max-width: 768px) 100vw, 34vw"
          priority={index < 10}
        />
      </div>
    </motion.article>
  );
}
