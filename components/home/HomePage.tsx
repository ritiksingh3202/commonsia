"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRef, useState } from "react";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { defaultFaqItems } from "@/lib/faq-content";
import type { HomeTestimonialCard } from "@/lib/testimonials";
import { MARKETING_SECTION_TITLE_CLASS } from "@/lib/marketing-section-title";
import { highResProfileImageUrl } from "@/lib/profile-image-url";
import { PaginationArrowLeft, PaginationArrowRight } from "@/components/icons/PaginationArrowIcons";
import { MentorCarouselArrows } from "@/components/mentors/MentorCarouselArrows";
import type { HomepageStats } from "@/lib/homepage-stats";
import { statLabel } from "@/lib/stat-label";

const FaqAccordion = dynamic(
  () => import("@/components/ui/FaqAccordion").then((m) => m.FaqAccordion),
  {
    loading: () => (
      <div className="mx-auto max-w-2xl space-y-3 py-8">
        <div className="h-12 animate-pulse rounded-xl bg-neutral-200/90" />
        <div className="h-12 animate-pulse rounded-xl bg-neutral-200/90" />
        <div className="h-12 animate-pulse rounded-xl bg-neutral-200/90" />
      </div>
    ),
  },
);

const steps = [
  {
    title: "Create your Profile",
    icon: "/home_assets/profile.svg",
    body: "Tell us your year, interests, and tools so we can match you with the right mentors.",
  },
  {
    title: "Find a Mentor",
    icon: "/home_assets/mentor.svg",
    body: "Browse by software, studio topics, or design focus — book someone who fits your goals.",
  },
  {
    title: "Schedule a quick Call",
    icon: "/home_assets/calendar.svg",
    body: "Pick a slot, join a focused session, and leave with clear next steps for your project.",
  },
];

/** Home “What Mentors Say” — real quotes; headshots in `public/mentor_testimonial/`. */
const mentorSpotlights = [
  {
    quote:
      "I feel teachers should better guide inside the classrooms rather than merely focusing on attendance and timely submissions. Architecture colleges feel like some hardcore preparation of something that'll be completely new to students once they come out in the real world.",
    name: "Saqib Khan",
    cred: "Mentor and Practitioner",
    avatar: "/mentor_testimonial/saqib.jpeg",
  },
  {
    quote:
      "Great stuff!! I will be looking forward to it. Also, if someone is interested in working out a research among my topic of expertise, I will be more than happy to help.",
    name: "Sahil Ali Khan",
    cred: "Mentor & researcher",
    avatar: "/mentor_testimonial/sahil.jpeg",
  },
];

/** Why Us — three stacked points; icons from `public/*.svg` (updated studio / portfolio / career assets). */
const whyUsItems = [
  {
    title: "Studio & Design",
    body: "Sharpen your design thinking with studio guidance, constructive critiques, building systems insight, and sustainability integration.",
    icon: "/studio.svg",
  },
  {
    title: "Portfolio Reviews",
    body: "Get meaningful, industry-informed feedback that elevates your portfolio and prepares you for real opportunities.",
    icon: "/portfolio_review.svg",
  },
  {
    title: "Career & Path",
    body: "Navigate your career with clarity. Explore roles, build the right skills, connect with professionals, and discover internship opportunities.",
    icon: "/career.svg",
  },
] as const;

/** Full-bleed strip — body `overflow-x-hidden` + clip here prevents horizontal page scroll */
const fullBleed =
  "relative left-1/2 right-auto w-screen max-w-[100vw] -translate-x-1/2 overflow-x-clip";

/** Illustration for “Start in 3 simple steps” (`public/home_assets/steps.png`) */
const STEPS_MAIN_IMAGE = "/home_assets/steps.png";

const heroEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const heroStack = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.13, delayChildren: 0.06 },
  },
};

const heroFadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease: heroEase },
  },
};

const communityCategories = [
  {
    href: "/community/competitions",
    label: "Competitions",
    desc: "Open architecture calls, student awards & paid briefs.",
    emoji: "🏆",
  },
  {
    href: "/community/thesis",
    label: "Thesis Library",
    desc: "Published B.Arch, M.Arch & PhD theses for research.",
    emoji: "📚",
  },
  {
    href: "/community/faculty-grants",
    label: "Grants & Faculty",
    desc: "Fellowships, research grants & faculty opportunities.",
    emoji: "🎓",
  },
  {
    href: "/community/startup-calls",
    label: "Startup Calls",
    desc: "Architecture startups & innovation open positions.",
    emoji: "🚀",
  },
] as const;

export function HomePage({ testimonials, stats }: { testimonials: HomeTestimonialCard[]; stats: HomepageStats }) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [stepOpen, setStepOpen] = useState<number | null>(null);
  const [mIndex, setMIndex] = useState(0);
  const studentScrollRef = useRef<HTMLDivElement>(null);

  const onJoinCommonsia = () => {
    if (sessionStatus === "loading") return;
    if (sessionStatus === "authenticated" && session?.user) {
      const role = session.user.role;
      if (role === "mentor") {
        router.push("/mentor");
        return;
      }
      if (role === "student") {
        router.push("/student");
        return;
      }
    }
    router.push("/role-select");
  };

  const mentorCurrent = mentorSpotlights[mIndex];
  const mLen = mentorSpotlights.length;
  const prevM = () => setMIndex((i) => (i - 1 + mLen) % mLen);
  const nextM = () => setMIndex((i) => (i + 1) % mLen);

  const scrollStudentRow = (dir: -1 | 1) => {
    const el = studentScrollRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-student-card]");
    const step = (card?.offsetWidth ?? 280) + 16;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <div className="section-gap-y min-w-0 max-w-full overflow-x-hidden bg-white pb-1">
      {/* Hero — one column, vertically centered; white → #FFEFD7 gradient (full band) */}
      <section className="home-hero-gradient home-hero-viewport relative flex flex-col overflow-hidden px-4 sm:px-6 lg:px-8">
          <motion.div
          className="relative z-10 mx-auto flex w-full max-w-[100rem] flex-1 flex-col justify-center py-10 sm:py-12 md:py-16 lg:py-20"
          variants={heroStack}
          initial="hidden"
          animate="visible"
        >
          <div className="mx-auto flex w-full min-w-0 max-w-[min(100%,46rem)] flex-col items-stretch text-center sm:max-w-3xl md:max-w-[40rem] lg:max-w-[min(100%,48rem)] xl:max-w-[min(100%,52rem)]">
            <motion.h1
              className="w-full max-w-full text-balance text-[clamp(1.85rem,6.5vw+0.35rem,2.75rem)] font-semibold leading-[1.12] tracking-[-0.02em] sm:text-[clamp(2.25rem,4.8vw+0.5rem,3.35rem)] sm:leading-[1.08] md:text-[clamp(2.5rem,3.8vw+0.65rem,3.65rem)] lg:text-[clamp(2.85rem,3.2vw+0.85rem,4rem)] lg:leading-[1.06]"
              variants={heroFadeUp}
            >
              <span className="text-primary">Architecture,</span>{" "}
              <span className="text-[#0a0a0a]">Beyond the Studios</span>
            </motion.h1>
            <motion.p
              variants={heroFadeUp}
              className="mx-auto mt-6 w-full min-w-0 max-w-[min(100%,34rem)] space-y-2.5 self-center px-0.5 text-pretty text-center font-sans text-[14px] font-normal leading-relaxed text-[#6a7282] [overflow-wrap:anywhere] sm:mt-7 sm:max-w-[min(100%,40rem)] sm:px-0 sm:text-[15px] md:mt-8 md:text-base"
            >
              <span className="block w-full min-w-0">
                A community first mentorship platform connecting students with practicing architects.
              </span>
              <span className="block w-full min-w-0">
                Connect, gain mentorship, and learn from real world practice.
              </span>
            </motion.p>
            <motion.div
              className="mx-auto mt-8 flex w-full max-w-md flex-col items-stretch justify-center gap-4 sm:mt-9 sm:max-w-none sm:flex-row sm:items-center sm:justify-center md:mt-10 md:gap-5"
              variants={heroFadeUp}
            >
              <motion.div
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className="w-full sm:w-auto"
            >
              <Link
                href="/mentors"
                prefetch
                  className="inline-flex w-full min-h-[48px] items-center justify-center rounded-full bg-[#0a0a0a] px-9 py-3.5 text-[15px] font-semibold tracking-wide text-white shadow-md shadow-black/10 transition-[box-shadow] hover:shadow-lg sm:min-h-[52px] sm:min-w-[12rem] sm:px-10 sm:py-4 sm:text-base"
              >
                Find a Mentor
              </Link>
              </motion.div>
              <motion.div
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className="w-full sm:w-auto"
              >
                <Link
                  href="/auth/register/mentor"
                  prefetch
                  className="inline-flex w-full min-h-[48px] items-center justify-center rounded-full border-2 border-[#0a0a0a] bg-transparent px-9 py-3.5 text-[15px] font-semibold tracking-wide text-[#0a0a0a] transition-[background-color,box-shadow] hover:bg-black/[0.03] sm:min-h-[52px] sm:min-w-[12rem] sm:px-10 sm:py-4 sm:text-base"
              >
                Become a Mentor
              </Link>
              </motion.div>
            </motion.div>
            </div>
          </motion.div>
      </section>

      {/* Stats strip — social proof numbers just below hero */}
      <section aria-label="Platform stats" className="border-y border-neutral-100 bg-white px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <dl className="mx-auto flex max-w-3xl items-center justify-around gap-2 sm:gap-6">
          {[
            { value: statLabel(stats.mentorCount), label: "Verified Mentors" },
            { value: statLabel(stats.postCount), label: "Free Resources" },
            { value: "20+", label: "Cities Represented" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-0.5 text-center">
              <dt className="text-[clamp(1.5rem,4vw,2.1rem)] font-bold leading-none tracking-tight text-primary">
                {s.value}
              </dt>
              <dd className="mt-1 text-[11px] font-medium uppercase tracking-widest text-neutral-500 sm:text-xs">
                {s.label}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Why us — `id` keeps /#who-we-are nav/footer links landing on meaningful content */}
      <section
        id="who-we-are"
        className="section-y scroll-mt-24 bg-white px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-6"
      >
        <SectionReveal>
          <h2 className={`${MARKETING_SECTION_TITLE_CLASS} mx-auto max-w-4xl text-center text-ink`}>Why Us?</h2>
        </SectionReveal>

        <div className="mx-auto mt-8 max-w-xl text-left lg:mt-10 lg:max-w-2xl">
          <div className="flex flex-col gap-10 sm:gap-12 lg:gap-14">
            {whyUsItems.map((w, i) => (
              <SectionReveal key={w.title} delay={i * 0.05}>
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="flex shrink-0 items-center justify-start">
              <Image
                src={w.icon}
                alt=""
                width={64}
                height={64}
                sizes="(max-width:640px) 56px, 64px"
                className="h-14 w-auto max-w-full object-contain object-left sm:h-16"
                style={{ width: "auto" }}
              />
            </div>
                  <h3 className="text-heading-card text-ink">{w.title}</h3>
                  <p className="text-[15px] leading-relaxed text-neutral-600 sm:text-base lg:text-[17px] lg:leading-relaxed">
                    {w.body}
                  </p>
                </div>
                </SectionReveal>
              ))}
          </div>
        </div>
      </section>

      {/* Steps — pulled up vs Why Us (section-gap-y + section-y stack) */}
      <section className="-mt-3 bg-white px-4 pb-3 pt-2 sm:px-6 sm:-mt-4 sm:pb-4 sm:pt-2.5 lg:-mt-5 lg:px-8 lg:pb-5 lg:pt-3">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2 lg:items-stretch lg:gap-[17px]">
          <SectionReveal className="flex flex-col justify-center text-left">
            <h2 className={`${MARKETING_SECTION_TITLE_CLASS} text-left text-[#1a1a1a]`}>
              Start in 3 simple <span className="text-primary">steps</span>
            </h2>
            <ul className="mt-2.5 flex flex-col gap-[27px] text-left sm:mt-3">
              {steps.map((s, i) => {
                const open = stepOpen === i;
                return (
                  <li key={s.title} className="overflow-hidden rounded-[16px]">
                    <button
                      type="button"
                      onClick={() => setStepOpen((c) => (c === i ? null : i))}
                      className={`flex w-full items-center gap-4 sm:gap-[43px] rounded-[16px] border border-neutral-200 bg-white px-4 py-4 text-left transition-all sm:px-5 sm:py-[18px] ${
                        open ? "border-neutral-300 shadow-sm" : "hover:border-neutral-300"
                      }`}
                    >
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary shadow-sm sm:size-[52px]">
                        <Image
                          src={s.icon}
                          alt=""
                          width={26}
                          height={26}
                          sizes="26px"
                          className="brightness-0 invert"
                        />
                      </span>
                      <span className="flex-1 text-base font-semibold text-ink sm:text-xl">
                        {s.title}
                      </span>
                      <motion.span
                        animate={{ rotate: open ? 180 : 0 }}
                        className="relative flex size-9 shrink-0 items-center justify-center"
                        aria-hidden
                      >
                        <Image
                          src="/dropdown.svg"
                          alt=""
                          width={28}
                          height={28}
                          sizes="28px"
                          className="icon-brand-line object-contain"
                        />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden rounded-b-[16px] border border-t-0 border-neutral-200 bg-neutral-50/90"
                        >
                          <p className="px-4 py-4 text-sm leading-relaxed text-neutral-700 sm:px-6 sm:text-[15px]">
                            {s.body}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </SectionReveal>
          <SectionReveal
            delay={0.08}
            className="flex w-full items-center justify-center lg:justify-end lg:pl-4"
          >
            <div className="relative aspect-[5/4] w-full max-w-[480px] sm:max-w-[520px] lg:max-w-[min(100%,600px)]">
              <Image
                src={STEPS_MAIN_IMAGE}
                alt=""
                fill
                className="object-contain object-center lg:object-right"
                sizes="(max-width:1024px) 90vw, 50vw"
              />
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Students — dark band; only when enough reviews for the 4-card grid */}
      {testimonials.length >= 4 ? (
        <section id="community" className="scroll-mt-24 overflow-x-hidden">
          <div className={`${fullBleed} bg-[#0a0a0a]`}>
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_70%_at_100%_-5%,rgba(241,100,34,0.55),rgba(255,87,34,0.18)_42%,transparent_58%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_120%,rgba(255,87,34,0.08),transparent_45%)]"
              aria-hidden
            />
            <div className="relative z-10 mx-auto min-w-0 max-w-7xl px-4 py-3.5 sm:px-6 sm:py-4 lg:px-8 lg:py-5">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.04 }}
                className="text-heading-display text-center text-white"
              >
                What <span className="text-primary">Students</span> Say
              </motion.p>

              <div
                ref={studentScrollRef}
                className="-mx-1 mt-3 flex min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-visible overscroll-x-contain overscroll-y-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:mx-0 lg:grid lg:snap-none lg:grid-cols-4 lg:gap-[25px] lg:overflow-visible lg:px-0 lg:pb-0 lg:overscroll-auto [&::-webkit-scrollbar]:hidden"
              >
                {testimonials.map((s) => (
                  <article
                    key={s.id}
                    data-student-card
                    className="flex h-full min-h-[260px] w-[min(280px,85vw)] shrink-0 snap-center flex-col rounded-2xl border border-white/10 bg-white p-4 shadow-lg sm:w-[min(300px,82vw)] sm:p-5 lg:min-h-[280px] lg:w-auto lg:min-w-0"
                  >
                    <div className="relative mx-auto size-14 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/25">
                      {s.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- profile avatars may be data URLs or arbitrary hosts
                        <img
                          src={highResProfileImageUrl(s.imageUrl, 128)}
                          alt=""
                          className="size-full object-cover object-center"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5 text-sm font-semibold text-primary">
                          {s.initials}
                        </div>
                      )}
                    </div>
                    <p className="mt-3 min-h-0 flex-1 text-left text-xs leading-relaxed text-neutral-700 sm:text-[13px]">
                      {s.text}
                    </p>
                    <div className="mt-2 shrink-0 border-t border-neutral-100 pt-1.5 text-left">
                      <p className="text-sm font-semibold text-[#1a1a1a]">{s.name}</p>
                      <p className="text-[11px] text-neutral-500 sm:text-xs">{s.role}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="relative mt-3 flex justify-center sm:mt-4">
                <div
                  className="pointer-events-none absolute left-4 right-4 top-1/2 border-t border-dashed border-white/25 sm:left-8 sm:right-8"
                  aria-hidden
                />
                <div className="relative z-[1] bg-[#0a0a0a] px-4">
                  <MentorCarouselArrows
                    ariaPrev="Scroll student testimonials left"
                    ariaNext="Scroll student testimonials right"
                    prevDisabled={false}
                    nextDisabled={false}
                    onPrev={() => scrollStudentRow(-1)}
                    onNext={() => scrollStudentRow(1)}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Mentors say — #FFF5E6 card, fixed height + scrollable quote, arrows only */}
      <section className="overflow-x-hidden bg-white px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-6">
        <div className="mx-auto min-w-0 max-w-7xl">
          <SectionReveal>
            <h2 className={`${MARKETING_SECTION_TITLE_CLASS} text-center text-black`}>
              <span>What </span>
              <span className="text-primary">Mentors</span>
              <span> Say</span>
            </h2>
          </SectionReveal>

          <div className="mx-auto mt-4 min-w-0 max-w-[min(100%,52rem)] sm:mt-5 sm:max-w-[min(100%,60rem)] lg:max-w-[min(100%,68rem)]">
            <SectionReveal delay={0.06} className="flex min-w-0 flex-col">
              <div className="relative mx-auto w-full px-2 sm:px-4">
                <span
                  className="pointer-events-none absolute -left-1 top-2 z-20 font-serif text-[clamp(3.5rem,14vw,5.5rem)] leading-none text-primary/20 sm:-left-0 sm:top-3"
                  aria-hidden
                >
                  &ldquo;
                </span>
                <span
                  className="pointer-events-none absolute -right-1 bottom-20 z-20 font-serif text-[clamp(3.5rem,14vw,5.5rem)] leading-none text-primary/20 sm:bottom-24 sm:right-0"
                    aria-hidden
                >
                  &rdquo;
                </span>

                <div className="relative z-10 flex min-h-[17.5rem] flex-col overflow-hidden rounded-[18px] border border-neutral-200/90 bg-[#FFF5E6] shadow-[0_16px_40px_-20px_rgba(0,0,0,0.12)] sm:min-h-[19rem] lg:min-h-[20rem]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mIndex}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                      className="flex min-h-0 flex-1 flex-col px-6 pb-5 pt-7 sm:px-8 sm:pb-5 sm:pt-8"
                    >
                      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-auto pr-0.5 [scrollbar-color:rgba(0,0,0,0.2)_transparent] [scrollbar-width:thin]">
                        <p className="text-pretty text-[15px] font-normal leading-[1.65] text-neutral-900 sm:text-base sm:leading-relaxed">
                          {mentorCurrent.quote}
                        </p>
                      </div>
                      <div className="mt-4 flex shrink-0 items-end gap-4 border-t border-black/[0.06] pt-4 sm:mt-4 sm:gap-4 sm:pt-5">
                        <div className="relative size-[56px] shrink-0 overflow-hidden rounded-full ring-2 ring-primary/30 ring-offset-2 ring-offset-[#FFF5E6] sm:size-[64px]">
                        <Image
                          src={mentorCurrent.avatar}
                          alt=""
                          fill
                            className="object-cover object-center"
                            sizes="64px"
                        />
                      </div>
                        <div className="min-w-0 flex-1 pb-0.5 text-left">
                          <p className="text-base font-bold text-neutral-900 sm:text-lg">{mentorCurrent.name}</p>
                          <p className="mt-1 text-sm text-neutral-500">{mentorCurrent.cred}</p>
                        </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
                </div>
              </div>

              <div className="mt-4 flex justify-center gap-2 sm:mt-5">
                  <motion.button
                    type="button"
                    aria-label="Previous mentor quote"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={prevM}
                  className="flex size-10 items-center justify-center rounded-full border-2 border-primary bg-white shadow-sm transition hover:bg-primary/5"
                  >
                    <PaginationArrowLeft className="icon-brand-line h-[11px] w-[14px]" />
                  </motion.button>
                  <motion.button
                    type="button"
                    aria-label="Next mentor quote"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={nextM}
                  className="flex size-10 items-center justify-center rounded-full border-2 border-primary bg-white shadow-sm transition hover:bg-primary/5"
                  >
                    <PaginationArrowRight className="icon-brand-line h-[11px] w-[14px]" />
                  </motion.button>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* Community Forum nudge — free resources teaser */}
      <section className="overflow-x-hidden bg-[#FAFAFA] px-4 pb-8 pt-6 sm:px-6 sm:pb-10 sm:pt-8 lg:px-8 lg:pb-12 lg:pt-10">
        <div className="mx-auto max-w-5xl">
          <SectionReveal className="text-center">
            <h2 className={`${MARKETING_SECTION_TITLE_CLASS} text-[#1a1a1a]`}>
              Free <span className="text-primary">Community Resources</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-neutral-500 sm:text-[15px]">
              Not ready for 1-on-1 mentorship? Browse live architecture competitions, thesis
              references, grants, and more — updated daily, no login required.
            </p>
          </SectionReveal>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
            {communityCategories.map((cat, i) => (
              <SectionReveal key={cat.href} delay={i * 0.05}>
                <Link
                  href={cat.href}
                  prefetch
                  className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:p-5"
                >
                  <span className="text-2xl" aria-hidden>{cat.emoji}</span>
                  <span className="mt-2.5 text-[14px] font-semibold text-[#1a1a1a] sm:text-[15px]">
                    {cat.label}
                  </span>
                  <span className="mt-1.5 text-[12px] leading-relaxed text-neutral-500 sm:text-[13px]">
                    {cat.desc}
                  </span>
                </Link>
              </SectionReveal>
            ))}
          </div>

          <SectionReveal delay={0.18} className="mt-6 text-center sm:mt-7">
            <Link
              href="/community"
              prefetch
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-6 py-2.5 text-[13px] font-semibold text-[#1a1a1a] shadow-sm transition hover:border-primary/50 hover:text-primary sm:text-[14px]"
            >
              Browse Community Forum →
            </Link>
          </SectionReveal>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="scroll-mt-24 overflow-x-hidden bg-[#ffffff] px-4 pb-3 pt-3 sm:px-6 sm:pb-4 sm:pt-4 lg:px-8 lg:pb-5 lg:pt-5"
      >
        <SectionReveal>
          <h2 className={`${MARKETING_SECTION_TITLE_CLASS} text-center text-[#1a1a1a]`}>
            Frequently Asked <span className="text-primary">Questions</span>
          </h2>
        </SectionReveal>
        <div className="mx-auto mt-3 min-w-0 max-w-4xl sm:mt-4">
          <FaqAccordion items={defaultFaqItems} />
        </div>
      </section>

      {/* Join community — black band, left-aligned headline + sub + pill CTA (marketing reference) */}
      <section id="join-community" className="scroll-mt-24 mb-10 sm:mb-12 lg:mb-14">
        <div className={`${fullBleed} bg-black`}>
          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
            <div className="max-w-3xl text-left">
              <h2 className="text-balance text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                Learn, Share, and Grow with the Architecture Community!
              </h2>
              <p className="mt-2 max-w-2xl font-normal leading-relaxed text-white sm:mt-3 sm:text-base lg:text-lg">
                Connect, gain mentorship, and learn from real world practice.
              </p>
              <button
                type="button"
                onClick={onJoinCommonsia}
                disabled={sessionStatus === "loading"}
                className="mt-8 inline-flex rounded-full bg-[#FF5C35] px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#f04d28] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 sm:mt-10 sm:py-3.5 sm:text-base"
              >
                Join Commonsia
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
