"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MentorCard } from "@/components/mentors/MentorCard";
import { MentorPagination } from "@/components/mentors/MentorPagination";
import { MentorSearchBar } from "@/components/mentors/MentorSearchBar";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { heroTitleGradientStyle } from "@/lib/hero-title-gradient";
import { marketingImages } from "@/lib/marketing-images";
import { mentors } from "@/lib/mentors-data";

const PAGE_SIZE = 10;

export function MentorsPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return mentors;
    return mentors.filter(
      (m) =>
        m.name.toLowerCase().includes(s) ||
        m.role.toLowerCase().includes(s) ||
        m.tags.some((t) => t.toLowerCase().includes(s)) ||
        m.detail.toLowerCase().includes(s),
    );
  }, [q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const heroAvatars = [
    marketingImages.avatar1,
    marketingImages.avatar2,
    marketingImages.avatar3,
    marketingImages.avatar4,
    marketingImages.avatar5,
  ];

  return (
    <div className="bg-white pb-6 sm:pb-8">
      {/* Hero — same proportions / rhythm as home (padding, type scale, CTAs, side art) */}
      {/* Hero title wraps with text-balance — no forced nowrap so long lines never clip */}
      <section className="relative bg-[#ffffff] px-4 pb-4 pt-12 sm:px-6 sm:pb-6 sm:pt-16 lg:px-8 lg:pb-8 lg:pt-24">
        <div className="relative mx-auto w-full max-w-[100rem] min-w-0 px-3 sm:px-5 lg:px-10">
          <motion.div
            className="absolute left-0 top-[15%] z-10 hidden w-[120px] md:block lg:top-[20%] lg:w-[160px] xl:top-[25%] xl:w-[200px] 2xl:w-[240px]"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="relative aspect-[3/5] w-full">
              <Image
                src={marketingImages.mentorsHeroLeft}
                alt=""
                fill
                className="object-contain object-bottom object-center"
                sizes="240px"
              />
            </div>
          </motion.div>

          <div className="relative z-20 mx-auto flex w-full min-w-0 max-w-2xl flex-col items-center justify-center px-2 text-center sm:max-w-4xl sm:px-3 lg:max-w-5xl xl:max-w-[65rem] 2xl:max-w-[75rem]">
            <motion.div
              className="mb-4 flex justify-center gap-0"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
            >
              {heroAvatars.map((src, i) => (
                <div
                  key={src}
                  className="relative -ml-2 size-10 overflow-hidden rounded-full border-2 border-white shadow first:ml-0 sm:size-11"
                  style={{ zIndex: heroAvatars.length - i }}
                >
                  <Image src={src} alt="" fill className="object-cover" sizes="40px" />
                </div>
              ))}
            </motion.div>
            <motion.p
              className="text-[11px] font-normal text-neutral-600 sm:text-xs lg:text-[13px]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.09 }}
            >
              The Community Platform for Architecture Students
            </motion.p>

            <motion.h1
              className="mx-auto mt-4 w-full min-w-0 max-w-[1117px] px-3 text-center text-[clamp(1.3rem,5.2vw+0.4rem,2.2rem)] font-semibold leading-[1.25] tracking-tight sm:px-4 sm:text-[2.5rem] sm:leading-[1.2] md:text-[3.15rem] md:leading-[1.18] lg:text-[3.65rem] xl:text-[4.1rem] 2xl:text-[4.75rem]"
              style={heroTitleGradientStyle}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="block max-w-full text-balance break-words [overflow-wrap:anywhere]">
                <span className="inline">Stuck in Your Design </span>
                <span className="inline">Journey?</span>
              </span>
              <span className="mt-1 block max-w-full text-balance break-words [overflow-wrap:anywhere] md:mt-0">
                <span className="inline">Find a </span>
                <span className="inline">Mentor.</span>
              </span>
            </motion.h1>

            <p className="mx-auto mt-4 max-w-4xl text-pretty text-center text-[14px] leading-relaxed text-neutral-600 sm:mt-6 sm:text-[16px] lg:text-lg">
              Connect with experienced architects, professors, and industry experts who
              guide you through design, portfolios, or real-world projects.
            </p>

            <motion.div
              className="mt-6 flex w-full max-w-sm flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row sm:gap-5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Link
                href="/mentors"
                className="w-full rounded-full bg-primary px-8 py-3 text-center text-[15px] font-semibold tracking-wide text-white shadow-md transition-all hover:scale-[1.03] hover:shadow-lg sm:w-auto sm:px-10 sm:py-3.5 sm:text-base"
              >
                Find a Mentor
              </Link>
              <Link
                href="/auth"
                className="w-full rounded-full border-2 border-primary bg-white px-8 py-3 text-center text-[15px] font-semibold tracking-wide text-primary transition-all hover:scale-[1.03] hover:bg-primary/5 sm:w-auto sm:px-10 sm:py-3.5 sm:text-base"
              >
                Become a Mentor
              </Link>
            </motion.div>
          </div>

          <motion.div
            className="absolute right-0 top-[15%] z-10 hidden w-[120px] md:block lg:top-[20%] lg:w-[160px] xl:top-[25%] xl:w-[200px] 2xl:w-[240px]"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="relative aspect-[3/5] w-full">
              <Image
                src={marketingImages.mentorsHeroRight}
                alt=""
                fill
                className="object-contain object-bottom object-center"
                sizes="240px"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <MentorSearchBar
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
        />

        <SectionReveal className="mt-3 sm:mt-3.5">
          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-5">
            {slice.map((m, i) => (
              <MentorCard key={m.id} mentor={m} index={i} />
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="py-5 text-center text-sm text-neutral-600 sm:py-6">
              No mentors match that search. Try another skill or software.
            </p>
          )}
        </SectionReveal>

        {filtered.length > 0 && (
          <MentorPagination
            page={safePage}
            total={totalPages}
            onPageChange={(p) => setPage(p)}
          />
        )}
      </div>
    </div>
  );
}
