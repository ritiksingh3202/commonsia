"use client";

import { SectionReveal } from "@/components/motion/SectionReveal";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Rocket, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const WHO_WE_ARE_BASE = "/who_we_are_assets" as const;
function whoWeAreImg(filename: string) {
  return `${WHO_WE_ARE_BASE}/${filename}?v=20260429`;
}

function TeamCardPhotoBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-b from-orange-50 via-[#fff0e0] to-[#ffe4cc]" />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.06] via-transparent to-white/40" />
      <svg
        className="absolute inset-0 size-full text-primary/[0.08]"
        viewBox="0 0 400 360"
        preserveAspectRatio="xMidYMax slice"
      >
        <title>Decorative arcs</title>
        {[95, 118, 142, 168, 195, 225, 258].map((ry, i) => (
          <ellipse key={ry} cx="200" cy="420" rx="340" ry={ry}
            fill="none" stroke="currentColor" strokeWidth="1" opacity={0.55 - i * 0.06} />
        ))}
      </svg>
    </div>
  );
}

const timeline = [
  {
    year: "2019",
    title: "The Beginning",
    description: "A thesis room at Jamia Millia Islamia. One seaplane airport project. A realisation that architectural knowledge is scattered — and access is luck.",
  },
  {
    year: "2021",
    title: "A Community Forms",
    description: "Open sessions for juniors. A WhatsApp group. Nearly 400 students, colleagues, and practitioners finding each other.",
  },
  {
    year: "2024",
    title: "The Limits Show",
    description: "WhatsApp doesn't scale. Mentors burn out. Students with the right contacts find answers; students without them don't.",
  },
  {
    year: "2026",
    title: "Commonsia Today",
    description: "Verified mentors. Structured sessions. Fair compensation. The same generosity — now with infrastructure behind it.",
  },
];

const beliefs = [
  {
    title: "Access over luck",
    description: "A career shouldn't be decided by who you happen to know. The right senior at the right moment shouldn't be a matter of luck.",
    icon: Users,
  },
  {
    title: "Beyond the studio",
    description: "A jury teaches you to defend a project. A mentor teaches you to build a life around one. The most important conversations happen outside the studio.",
    icon: MessageCircle,
  },
  {
    title: "Structure sustains generosity",
    description: "Mentors give their time, their experience, their honesty. Our job is to make that worth their while — every single time.",
    icon: Heart,
  },
];

export function WhoWeArePage() {
  const [mentorCount, setMentorCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d: { mentorCount?: number }) => {
        if (typeof d.mentorCount === "number") setMentorCount(d.mentorCount);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-white px-6 py-14 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07] bg-center bg-repeat"
          style={{ backgroundImage: `url(${WHO_WE_ARE_BASE}/hero_bg.png)`, backgroundSize: "520px auto" }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-primary"
          >
            About Commonsia
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="text-balance text-3xl font-semibold leading-[1.12] tracking-tight text-black sm:text-4xl"
          >
            Good mentors
            shouldn&apos;t be a privilege.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-neutral-500 sm:text-base"
          >
            We connect architecture students with practising architects — for portfolio
            reviews, career guidance, design crits, and the kind of conversation that
            shapes a career.
          </motion.p>
        </div>
      </section>

      {/* ── Founder ── */}
      <section className="border-t border-black/[0.06] bg-white px-6 py-12 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <SectionReveal>
            <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:gap-10">

              {/* Photo */}
              <Link
                href="https://www.linkedin.com/in/shujarehman12/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View Shuja Rehman on LinkedIn"
                className="group shrink-0"
              >
                <div className="relative h-64 w-[13.5rem] overflow-hidden rounded-2xl border border-neutral-200/80 shadow-md transition-all group-hover:-translate-y-1 group-hover:shadow-xl sm:h-72 sm:w-60">
                  <TeamCardPhotoBackdrop />
                  <Image
                    src={whoWeAreImg("Shuja.png")}
                    alt="Shuja Rehman"
                    fill
                    sizes="240px"
                    className="object-cover object-[50%_10%] scale-[1.08] [transform-origin:50%_24%] drop-shadow-[0_8px_24px_rgba(0,0,0,0.13)]"
                    priority
                  />
                </div>
              </Link>

              {/* Info */}
              <div className="text-center sm:text-left">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Shuja Rehman
                </h2>
                <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                  Founder
                </p>
                {mentorCount !== null ? (
                  <p className="mt-3 text-lg font-semibold text-primary sm:text-xl">
                    + {mentorCount} mentors
                  </p>
                ) : (
                  <p className="mt-3 h-7" aria-hidden />
                )}
              </div>

            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ── Timeline (horizontal) ── */}
      <section className="border-t border-black/[0.06] bg-neutral-50 px-6 py-12 sm:py-14">
        <div className="mx-auto max-w-5xl">
          <SectionReveal>
            <h2 className="mb-10 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
              How we got here
            </h2>
          </SectionReveal>

          <div className="relative">
            {/* Horizontal rail — desktop only, runs through the dots */}
            <div
              className="absolute top-[1.35rem] hidden h-px w-full bg-neutral-200 md:block"
              style={{ left: "12.5%", width: "75%" }}
              aria-hidden
            />

            <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4 md:gap-x-6">
              {timeline.map((item, i) => (
                <SectionReveal key={item.year} delay={i * 0.07}>
                  <div className="flex flex-col items-start md:items-center md:text-center">
                    {/* Year dot */}
                    <div className="relative z-10 mb-4 flex h-[2.7rem] w-[2.7rem] shrink-0 items-center justify-center rounded-full border border-black/[0.09] bg-white shadow-sm">
                      <span className="text-[9px] font-bold leading-none text-primary">{item.year}</span>
                    </div>
                    {/* Content */}
                    <p className="mb-1.5 text-sm font-bold text-gray-900">{item.title}</p>
                    <p className="text-[13px] leading-relaxed text-gray-500">{item.description}</p>
                  </div>
                </SectionReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Beliefs ── */}
      <section className="border-t border-black/[0.06] bg-white px-6 py-12 sm:py-14">
        <div className="mx-auto max-w-4xl">
          <SectionReveal>
            <h2 className="mb-8 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
              What we believe
            </h2>
          </SectionReveal>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {beliefs.map((b, i) => {
              const Icon = b.icon;
              return (
                <SectionReveal key={b.title} delay={i * 0.06} className="flex">
                  <div className="flex h-full w-full flex-col rounded-2xl border border-black/[0.07] bg-neutral-50 px-5 py-5">
                    <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-4" aria-hidden />
                    </div>
                    <p className="mb-2 text-sm font-bold text-gray-900">{b.title}</p>
                    <p className="text-sm leading-relaxed text-gray-500">{b.description}</p>
                  </div>
                </SectionReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden bg-neutral-950 px-6 py-12 sm:py-14">
        <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:54px_54px]" />
          <div className="absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        </div>
        <SectionReveal className="relative z-10 mx-auto max-w-2xl text-center text-white">
          <Rocket className="mx-auto mb-4 size-8 text-white/70" aria-hidden />
          <h2 className="text-2xl font-black leading-tight sm:text-3xl">
            We&apos;re building it.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
            Join us in reshaping architectural education — with real mentors, real
            conversations, and the structure to make guidance accessible.
          </p>
          <div className="mt-6">
            <Link
              href="/auth"
              className="inline-block rounded-xl bg-white px-8 py-3 text-sm font-bold text-neutral-950 shadow-xl transition-all hover:scale-[1.02] hover:bg-neutral-100 sm:px-10 sm:py-3.5 sm:text-base"
            >
              Join Commonsia
            </Link>
          </div>
        </SectionReveal>
      </section>

    </div>
  );
}
