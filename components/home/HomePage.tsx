"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { FaqAccordion } from "@/components/ui/FaqAccordion";
import { defaultFaqItems } from "@/lib/faq-content";
import { HOME_MARKETING_ASSETS } from "@/lib/home-marketing-assets";
import type { HomeTestimonialCard } from "@/lib/testimonials";
import { MENTOR_PAGE_HERO_ASSETS } from "@/lib/mentor-page-assets";
import { marketingImages } from "@/lib/marketing-images";
import { highResProfileImageUrl } from "@/lib/profile-image-url";
import { MentorCarouselArrows } from "@/components/mentors/MentorCarouselArrows";

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

const mentorSpotlights = [
  {
    quote:
      "Mentoring students through this platform has been a rewarding experience. It allows us to guide young architects, review their ideas, and share industry perspectives that help them grow academically and professionally.",
    name: "Ar. Saurabh Singh",
    cred: "IIT Roorkee",
    avatar: MENTOR_PAGE_HERO_ASSETS.mentorPhoto,
  },
  {
    quote:
      "The questions students bring here are sharp — we work through representation, structure, and narrative so their juries land with clarity and confidence.",
    name: "Ar. Kavita Menon",
    cred: "Principal Architect",
    avatar: HOME_MARKETING_ASSETS.student2,
  },
];

const whyItems = [
  {
    title: "Architecture Mentorship",
    body: "Learn directly from experienced architects who guide students through design thinking, studio challenges, and real-world architectural practices.",
    icon: "/home_assets/mentorship.svg",
    align: "left" as const,
  },
  {
    title: "Design Guidance",
    body: "Get practical advice on studio projects, design concepts, software tools, and portfolios to strengthen your architectural skills.",
    icon: "/home_assets/guidance.svg",
    align: "left" as const,
  },
  {
    title: "1-on-1 Mentor Sessions",
    body: "Connect with mentors through scheduled one-to-one meetings to discuss design ideas, resolve doubts, and receive personalized feedback on your work.",
    icon: "/home_assets/1-1.svg",
    align: "right" as const,
  },
  {
    title: "Software Guidance",
    body: "Level up Rhino, BIM, and visualization workflows with mentors who use these tools every day in practice.",
    icon: "/home_assets/software.svg",
    align: "right" as const,
  },
];

/** Full-bleed strip — body `overflow-x-hidden` + clip here prevents horizontal page scroll */
const fullBleed =
  "relative left-1/2 right-auto w-screen max-w-[100vw] -translate-x-1/2 overflow-x-clip";

/** Hero figures — `public/home_assets/img_2.png` (left), `img_3.png` (right). */
const HOME_HERO_LEFT = "/home_assets/img_2.png";
const HOME_HERO_RIGHT = "/home_assets/img_3.png";

/** Illustration for “Start in 3 simple steps” (`public/home_assets/steps.png`) */
const STEPS_MAIN_IMAGE = "/home_assets/steps.png";

function WhyIcon({ src, className }: { src: string; className?: string }) {
  return (
    <div
      className={`flex h-14 w-14 shrink-0 items-center justify-center sm:h-16 sm:w-16 ${className ?? ""}`}
    >
      <Image
        src={src}
        alt=""
        width={56}
        height={56}
        className="icon-brand-line max-h-full max-w-full object-contain"
      />
    </div>
  );
}

export function HomePage({ testimonials }: { testimonials: HomeTestimonialCard[] }) {
  const [stepOpen, setStepOpen] = useState<number | null>(null);
  const [mIndex, setMIndex] = useState(0);
  const studentScrollRef = useRef<HTMLDivElement>(null);

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
      {/* Hero — white bg + flanking figures */}
      <section className="relative overflow-hidden bg-[#ffffff] px-4 pb-4 pt-12 sm:px-6 sm:pb-6 sm:pt-16 lg:px-8 lg:pb-8 lg:pt-24">
        <div className="relative mx-auto w-full max-w-[100rem] px-3 sm:px-5 lg:px-10">
          
          {/* Left Flanking Image (Absolute on Desktop) */}
          <motion.div
            className="hidden md:block absolute left-0 top-[15%] lg:top-[20%] xl:top-[25%] w-[120px] lg:w-[160px] xl:w-[200px] 2xl:w-[240px] z-10"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="relative aspect-[3/5] w-full">
              <Image
                src={HOME_HERO_LEFT}
                alt=""
                fill
                className="object-contain object-bottom object-center"
                sizes="240px"
              />
            </div>
          </motion.div>

          <div className="relative z-20 mx-auto flex w-full min-w-0 max-w-2xl flex-col items-center justify-center px-1 text-center sm:max-w-4xl sm:px-2 lg:max-w-5xl xl:max-w-[65rem] 2xl:max-w-[75rem]">
            <motion.div
              className="relative mb-4 flex w-full max-w-[min(100%,360px)] justify-center sm:max-w-[420px]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
            >
              <div className="relative h-11 w-full sm:h-14">
                <Image
                  src={HOME_MARKETING_ASSETS.heroTop}
                  alt=""
                  fill
                  className="object-contain object-center"
                  sizes="(max-width:640px) 360px, 420px"
                  priority
                />
              </div>
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
              className="mx-auto mt-4 w-full min-w-0 max-w-[1117px] px-1 text-center text-[clamp(1.3rem,5.2vw+0.4rem,2.2rem)] font-semibold leading-[1.25] tracking-tight sm:px-2 sm:text-[2.5rem] sm:leading-[1.2] md:text-[3.15rem] md:leading-[1.18] lg:text-[3.65rem] xl:text-[4.1rem] 2xl:text-[4.75rem]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="block max-w-full text-balance break-words [overflow-wrap:anywhere]">
                <span className="text-[#0a0a0a]">Learn &amp; Discuss </span>
                <span className="text-primary">Architecture</span>
              </span>
              <span className="mt-1 block max-w-full text-balance break-words [overflow-wrap:anywhere] md:mt-0">
                <span className="text-[#0a0a0a]">Beyond the </span>
                <span className="text-primary">Classroom</span>
              </span>
            </motion.h1>
            <p className="mx-auto mt-4 max-w-4xl text-pretty text-center text-[14px] leading-relaxed text-neutral-600 sm:mt-6 sm:text-[16px] lg:text-lg">
              Connect with experienced mentors, ask questions, discuss design ideas, and
              explore insights shared by the architecture community. A platform where
              students learn beyond studios and grow through real conversations and
              guidance.
            </p>
            <motion.div
              className="mt-6 flex w-full max-w-sm flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row sm:gap-5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Link
                href="/mentors"
                className="w-full text-center rounded-full bg-primary px-8 py-3 text-[15px] font-semibold tracking-wide text-white shadow-md transition-all hover:scale-[1.03] hover:shadow-lg sm:w-auto sm:px-10 sm:py-3.5 sm:text-base"
              >
                Find a Mentor
              </Link>
              <Link
                href="/mentors"
                className="w-full text-center rounded-full border-2 border-primary bg-white px-8 py-3 text-[15px] font-semibold tracking-wide text-primary transition-all hover:scale-[1.03] hover:bg-primary/5 sm:w-auto sm:px-10 sm:py-3.5 sm:text-base"
              >
                Become a Mentor
              </Link>
            </motion.div>
          </div>

          {/* Right Flanking Image (Absolute on Desktop) */}
          <motion.div
            className="hidden md:block absolute right-0 top-[15%] lg:top-[20%] xl:top-[25%] w-[120px] lg:w-[160px] xl:w-[200px] 2xl:w-[240px] z-10"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="relative aspect-[3/5] w-full">
              <Image
                src={HOME_HERO_RIGHT}
                alt=""
                fill
                className="object-contain object-bottom object-center"
                sizes="240px"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Empowering */}
      <section
        id="who-we-are"
        className="section-y scroll-mt-24 px-4 sm:px-6 lg:px-8"
      >
        <SectionReveal>
          <h2 className="text-heading-display mx-auto max-w-4xl text-center text-[#1a1a1a]">
            Empowering Learning and{" "}
            <span className="text-primary">Transforming Futures</span>
          </h2>
        </SectionReveal>
        <div className="mx-auto mt-3 grid max-w-7xl auto-rows-fr gap-[30px] lg:grid-cols-12 lg:grid-rows-2">
          <SectionReveal className="lg:col-span-5 lg:row-span-1">
            <div className="flex h-full min-h-[280px] flex-col rounded-[20px] bg-cream-soft p-5 text-left sm:p-6 lg:min-h-[300px]">
              <h3 className="text-heading-card text-[#1a1a1a]">
                Building the Future of Architecture
              </h3>
              <div className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-[12px]">
                <Image
                  src={marketingImages.featureBuilding}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 42vw"
                />
              </div>
            </div>
          </SectionReveal>
          <SectionReveal className="lg:col-span-4 lg:row-span-1" delay={0.05}>
            <div className="flex h-full min-h-[280px] flex-col rounded-[20px] bg-mint p-5 text-left sm:p-6 lg:min-h-[300px]">
              <h3 className="text-heading-card text-[#1a1a1a]">
                A Community of Designers
              </h3>
              <div className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-[12px]">
                <Image
                  src={marketingImages.featureCommunity}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 35vw"
                />
              </div>
            </div>
          </SectionReveal>
          <SectionReveal className="lg:col-span-3 lg:row-span-2" delay={0.1}>
            <div className="flex h-full min-h-[320px] flex-col rounded-[20px] bg-[#fff9e6] p-5 text-left sm:p-6 lg:min-h-0">
              <h3 className="text-heading-card text-[#1a1a1a]">
                Mentorship that Matters
              </h3>
              <p className="mt-1.5 text-left text-sm leading-relaxed text-[#1a1a1a] sm:text-base">
                By connecting students with experienced mentors, we aim to provide
                practical insights that help young architects grow with confidence.
              </p>
              <div className="relative mt-2 min-h-[200px] flex-1 overflow-hidden rounded-[15px] lg:min-h-0">
                <Image
                  src={marketingImages.featureMentorship}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 28vw"
                />
              </div>
            </div>
          </SectionReveal>
          <SectionReveal
            className="lg:col-span-9 lg:row-span-1 lg:col-start-1 lg:row-start-2"
            delay={0.08}
          >
            <div className="grid h-full min-h-[280px] gap-[14px] rounded-[20px] bg-mint p-5 text-left sm:p-6 md:grid-cols-2 md:items-center lg:min-h-[300px]">
              <div className="flex flex-col justify-center text-left">
                <h3 className="text-heading-card text-[#1a1a1a]">
                  Learning Beyond the Studio
                </h3>
                <p className="mt-2 text-left text-sm leading-relaxed text-[#1a1a1a] sm:text-base">
                  We believe architecture learning should not stop after class. Students
                  deserve a space where they can ask questions, explore ideas, and
                  receive guidance anytime.
                </p>
              </div>
              <div className="relative min-h-[200px] w-full overflow-hidden rounded-[14px] md:min-h-[220px]">
                <Image
                  src={marketingImages.featureStudio}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 50vw"
                />
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Why us — tighter bottom so gap to Steps isn’t huge */}
      <section className="px-4 pb-2 pt-3 sm:px-6 sm:pb-2.5 sm:pt-4 lg:px-8 lg:pb-3 lg:pt-5">
        <SectionReveal>
          <p className="text-center text-sm font-semibold text-ink sm:text-base">
            Why Us?
          </p>
          <h2 className="text-heading-display mx-auto mt-2 max-w-4xl text-center text-ink">
            Receive Guidance from{" "}
            <span className="text-primary">Industry Experts</span>
          </h2>
        </SectionReveal>

        <div className="mt-3 lg:hidden">
          <SectionReveal>
            <div className="relative mx-auto aspect-[4/5] w-full max-w-md min-h-[380px] sm:max-w-lg sm:min-h-[420px]">
              <Image
                src={marketingImages.whyUsCenter}
                alt=""
                fill
                className="object-contain object-center scale-110 sm:scale-[1.15]"
                sizes="(max-width:640px) 90vw, 520px"
              />
            </div>
          </SectionReveal>
          <div className="mt-3 grid grid-cols-1 gap-[30px] sm:grid-cols-2">
            {whyItems.map((w, i) => (
              <SectionReveal key={w.title} delay={i * 0.04}>
                <motion.div
                  className="flex flex-col gap-[15px] text-left"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <WhyIcon src={w.icon} />
                  <h3 className="text-heading-card text-ink">{w.title}</h3>
                  <p className="text-left text-sm leading-relaxed text-neutral-600 sm:text-[15px]">
                    {w.body}
                  </p>
                </motion.div>
              </SectionReveal>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-3 hidden max-w-7xl items-start lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,460px)_minmax(0,1fr)] lg:gap-[30px]">
          <div className="flex flex-col gap-5 pt-0.5 lg:gap-[25px] lg:pt-1">
            {whyItems
              .filter((w) => w.align === "left")
              .map((w, i) => (
                <SectionReveal key={w.title} delay={i * 0.05}>
                  <motion.div
                    className="flex max-w-sm flex-col gap-[15px] text-left"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  >
                    <WhyIcon src={w.icon} />
                    <h3 className="text-heading-card text-ink">{w.title}</h3>
                    <p className="text-left text-sm leading-relaxed text-neutral-600 sm:text-[15px] lg:text-base">
                      {w.body}
                    </p>
                  </motion.div>
                </SectionReveal>
              ))}
          </div>

          <SectionReveal className="sticky top-24 self-center" delay={0.06}>
            <div className="relative mx-auto aspect-[3/4] w-full max-h-[min(82vh,760px)] lg:max-h-[min(86vh,840px)]">
              <Image
                src={marketingImages.whyUsCenter}
                alt=""
                fill
                className="object-contain object-center lg:scale-[1.18] xl:scale-[1.26]"
                sizes="(max-width: 1024px) 90vw, 560px"
              />
            </div>
          </SectionReveal>

          <div className="flex flex-col gap-5 pt-0.5 lg:gap-[25px] lg:pt-1">
            {whyItems
              .filter((w) => w.align === "right")
              .map((w, i) => (
                <SectionReveal key={w.title} delay={i * 0.05}>
                  <motion.div
                    className="flex max-w-sm flex-col gap-[15px] text-left"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  >
                    <WhyIcon src={w.icon} />
                    <h3 className="text-heading-card text-ink">{w.title}</h3>
                    <p className="text-left text-sm leading-relaxed text-neutral-600 sm:text-[15px] lg:text-base">
                      {w.body}
                    </p>
                  </motion.div>
                </SectionReveal>
              ))}
          </div>
        </div>
      </section>

      {/* Steps — pulled up vs Why Us (section-gap-y + section-y stack) */}
      <section className="-mt-3 bg-white px-4 pb-3 pt-2 sm:px-6 sm:-mt-4 sm:pb-4 sm:pt-2.5 lg:-mt-5 lg:px-8 lg:pb-5 lg:pt-3">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2 lg:items-stretch lg:gap-[17px]">
          <SectionReveal className="flex flex-col justify-center text-left">
            <h2 className="text-heading-display text-left text-[#1a1a1a]">
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
                What <span className="text-[#f16422]">Students</span> Say
              </motion.p>

              <div
                ref={studentScrollRef}
                className="-mx-1 mt-3 flex min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-visible px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:mx-0 lg:grid lg:snap-none lg:grid-cols-4 lg:gap-[25px] lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
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
                          src={highResProfileImageUrl(s.imageUrl)}
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

      {/* Mentors say — Figma 44:351–363, 45:421 */}
      <section className="overflow-x-hidden bg-white px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5 lg:px-8 lg:pb-5 lg:pt-6">
        <div className="mx-auto min-w-0 max-w-[1200px]">
          <SectionReveal>
            <h2 className="text-heading-display text-center text-black">
              <span>What </span>
              <span className="text-primary">Mentors</span>
              <span> Say</span>
            </h2>
          </SectionReveal>
          <div className="mt-3 grid min-w-0 gap-6 sm:mt-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-stretch lg:gap-[50px]">
            <SectionReveal delay={0.05} className="flex min-h-0 min-w-0 justify-center lg:justify-start">
              <div className="flex h-full w-full max-w-[380px] flex-col gap-[54px] overflow-hidden rounded-[20px] bg-black shadow-sm">
                <div className="relative min-h-[130px] shrink-0 px-5 py-6 sm:px-6 sm:py-8">
                  <div
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_95%_100%_at_100%_0%,#ff7700_0%,#c15b01_22%,#442204_55%,#0a0a0a_88%,#000_100%)]"
                    aria-hidden
                  />
                  <p className="text-heading-display relative z-10 max-w-[300px] leading-[1.15] text-white">
                    90% of Students Succeed after Mentorship
                  </p>
                </div>
                <div className="relative min-h-[200px] flex-1 p-3">
                  <div className="relative h-full min-h-[180px] overflow-hidden rounded-[15px]">
                    <Image
                      src={marketingImages.mentorsStatCardPhoto}
                      alt=""
                      fill
                      className="object-cover object-center"
                      sizes="380px"
                    />
                  </div>
                </div>
              </div>
            </SectionReveal>
            <SectionReveal delay={0.08} className="flex min-h-0 min-w-0 h-full flex-col">
              <div className="relative flex min-h-[350px] min-w-0 flex-1 flex-col overflow-hidden rounded-[20px] bg-[#fff5e6] p-6 sm:min-h-[380px] sm:p-8 lg:min-h-[400px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mIndex}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.28 }}
                    className="flex min-h-0 flex-1 flex-col pb-14"
                  >
                    <p className="flex-1 text-xl font-normal italic leading-[1.15] text-black sm:text-2xl">
                      &ldquo;{mentorCurrent.quote}&rdquo;
                    </p>
                    <div className="mt-4 flex items-center gap-[14px]">
                      <div className="relative size-[60px] shrink-0 overflow-hidden rounded-full">
                        <Image
                          src={mentorCurrent.avatar}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="60px"
                        />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-base font-semibold italic text-black">{mentorCurrent.name}</p>
                        <p className="mt-0.5 text-xs font-semibold italic text-black">{mentorCurrent.cred}</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="absolute bottom-5 right-5 flex gap-2">
                  <motion.button
                    type="button"
                    aria-label="Previous mentor quote"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={prevM}
                    className="flex size-10 items-center justify-center rounded-full border-2 border-primary bg-white"
                  >
                    <Image src="/left_arrow.svg" alt="" width={14} height={11} className="icon-brand-line" />
                  </motion.button>
                  <motion.button
                    type="button"
                    aria-label="Next mentor quote"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={nextM}
                    className="flex size-10 items-center justify-center rounded-full border-2 border-primary bg-white"
                  >
                    <Image src="/right_arrow.svg" alt="" width={14} height={11} className="icon-brand-line" />
                  </motion.button>
                </div>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="scroll-mt-24 overflow-x-hidden bg-[#ffffff] px-4 pb-3 pt-3 sm:px-6 sm:pb-4 sm:pt-4 lg:px-8 lg:pb-5 lg:pt-5"
      >
        <SectionReveal>
          <h2 className="text-heading-display text-center text-[#1a1a1a]">
            Frequently Asked <span className="text-primary">Questions</span>
          </h2>
        </SectionReveal>
        <div className="mx-auto mt-3 min-w-0 max-w-4xl sm:mt-4">
          <FaqAccordion items={defaultFaqItems} />
        </div>
      </section>

      {/* Join community — black band, orange glow from right, left copy + right art */}
      <section id="join-community" className="scroll-mt-24 mb-10 sm:mb-12 lg:mb-14">
        <div className={`${fullBleed} overflow-hidden bg-[#0a0a0a]`}>
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_120%_at_92%_50%,rgba(255,107,53,0.75),rgba(255,87,34,0.35)_32%,rgba(0,0,0,0)_62%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-l from-primary/45 from-[8%] via-transparent via-55% to-transparent"
            aria-hidden
          />
          <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-3.5 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-[22px] lg:px-8 lg:py-5">
            <div className="w-full max-w-[min(100%,52rem)] text-center lg:flex-1 lg:text-left">
              <h2 className="text-heading-display text-balance tracking-tight text-white">
                Learn, Share, and Grow with the Architecture Community!
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-white/95 sm:text-[15px] lg:mx-0 lg:max-w-3xl">
                Discover a platform built for architecture students to connect with
                mentors, discuss ideas, and explore insights from the community. Take the
                next step in your design journey.
              </p>
              <Link
                href="/auth"
                className="mt-3 inline-flex rounded-full bg-primary px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] lg:mx-0"
              >
                Join the Community
              </Link>
            </div>
            <div className="relative h-[220px] w-full max-w-[420px] shrink-0 sm:h-[260px] sm:max-w-[480px] lg:h-[min(320px,34vh)] lg:w-[min(46%,440px)] lg:max-w-none">
              <Image
                src={marketingImages.joinCommunityHero}
                alt=""
                fill
                className="object-contain object-center lg:object-right lg:object-bottom"
                sizes="(max-width:1024px) 420px, 440px"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
