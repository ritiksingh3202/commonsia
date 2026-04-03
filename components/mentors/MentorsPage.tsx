"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MentorCard } from "@/components/mentors/MentorCard";
import { MentorPagination } from "@/components/mentors/MentorPagination";
import { MentorSearchBar } from "@/components/mentors/MentorSearchBar";
import { SectionReveal } from "@/components/motion/SectionReveal";
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
      <section className="relative overflow-hidden bg-[#ffffff] px-4 pb-6 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-5">
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-5 lg:px-10">
          <div className="flex flex-col items-center lg:flex-row lg:items-start lg:justify-center lg:gap-6 xl:gap-12">
            <motion.div
              className="relative order-2 hidden w-[min(130px,13vw)] shrink-0 self-start pt-5 sm:w-[min(150px,14vw)] lg:order-1 lg:block lg:pt-8 xl:pt-10"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55 }}
            >
              <div className="relative aspect-[3/5] w-full max-h-[min(340px,36vh)]">
                <Image
                  src={marketingImages.mentorsHeroLeft}
                  alt=""
                  fill
                  className="object-contain object-bottom object-center"
                  sizes="150px"
                />
              </div>
            </motion.div>

            <div className="order-1 flex w-full max-w-2xl flex-col items-center text-center sm:max-w-3xl lg:order-2 lg:max-w-4xl xl:max-w-[52rem]">
              <div className="mb-3 flex justify-center gap-0">
                {heroAvatars.map((src, i) => (
                  <div
                    key={src}
                    className="-ml-2 first:ml-0 relative size-10 overflow-hidden rounded-full border-2 border-white shadow sm:size-11"
                    style={{ zIndex: heroAvatars.length - i }}
                  >
                    <Image src={src} alt="" fill className="object-cover" sizes="40px" />
                  </div>
                ))}
              </div>
              <p className="text-xs font-normal text-neutral-600 sm:text-sm">
                The Community Platform for Architecture Students
              </p>
              <motion.h1
                className="mt-3 max-w-4xl text-heading-display-hero"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span className="block md:whitespace-nowrap">
                  <span className="text-[#301b14]">Stuck in Your </span>
                  <span className="text-hero-title-accent">Design Journey</span>
                  <span className="text-[#301b14]">?</span>
                </span>
                <span className="mt-1 block md:mt-0 md:whitespace-nowrap">
                  <span className="text-[#301b14]">Find a </span>
                  <span className="text-hero-title-accent">Mentor</span>
                  <span className="text-[#301b14]">.</span>
                </span>
              </motion.h1>
              <p className="mx-auto mt-2.5 max-w-5xl text-pretty text-center text-sm leading-relaxed text-neutral-700 sm:text-[15px]">
                Connect with experienced architects, professors, and industry experts who
                guide you through design, portfolios, or real-world projects.
              </p>
              <motion.div
                className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
              >
                <Link
                  href="/mentors"
                  className="rounded-full bg-primary px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02]"
                >
                  Find a Mentor
                </Link>
                <Link
                  href="/auth"
                  className="rounded-full border-2 border-primary bg-white px-8 py-2.5 text-sm font-semibold text-primary transition-transform hover:scale-[1.02]"
                >
                  Become a Mentor
                </Link>
              </motion.div>
            </div>

            <motion.div
              className="relative order-3 hidden w-[min(130px,13vw)] shrink-0 self-start pt-5 sm:w-[min(150px,14vw)] lg:block lg:pt-8 xl:pt-10"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55 }}
            >
              <div className="relative aspect-[3/5] w-full max-h-[min(340px,36vh)]">
                <Image
                  src={marketingImages.mentorsHeroRight}
                  alt=""
                  fill
                  className="object-contain object-bottom object-center"
                  sizes="150px"
                />
              </div>
            </motion.div>
          </div>
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
