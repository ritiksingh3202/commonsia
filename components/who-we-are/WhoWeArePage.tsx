"use client";

import { SectionReveal } from "@/components/motion/SectionReveal";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  Calendar,
  CheckCircle2,
  Code2,
  Globe,
  Heart,
  MapPin,
  MessageCircle,
  Rocket,
  TrendingUp,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

/** Warm orange gradient behind team portraits (no grid texture) + soft arcs. */
function TeamCardPhotoBackdrop({ className }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className ?? ""}`} aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-b from-orange-50 via-[#fff0e0] to-[#ffe4cc]" />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.06] via-transparent to-white/40" />
      <svg
        className="absolute inset-0 size-full text-primary/[0.08]"
        viewBox="0 0 400 360"
        preserveAspectRatio="xMidYMax slice"
      >
        <title>Decorative arcs</title>
        {[
          { ry: 95, opacity: 0.55 },
          { ry: 118, opacity: 0.45 },
          { ry: 142, opacity: 0.38 },
          { ry: 168, opacity: 0.32 },
          { ry: 195, opacity: 0.26 },
          { ry: 225, opacity: 0.2 },
          { ry: 258, opacity: 0.14 },
        ].map((ring, i) => (
          <ellipse
            key={i}
            cx="200"
            cy="420"
            rx="340"
            ry={ring.ry}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity={ring.opacity}
          />
        ))}
      </svg>
    </div>
  );
}

type TeamMember = {
  name: string;
  role: string;
  description: string;
  initial: string;
  imageSrc: string;
  tags: string[];
  footerIcon: LucideIcon;
  /** Extra Tailwind `object-*` / `object-[x_y]` for per-photo framing. */
  photoObjectClass?: string;
};

const WHO_WE_ARE_BASE = "/who_we_are_assets" as const;

function whoWeAreImg(filename: string) {
  return `${WHO_WE_ARE_BASE}/${filename}?v=20260429`;
}

function SoftGrid() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0 bg-center bg-repeat opacity-[0.12]"
        style={{ backgroundImage: `url(${WHO_WE_ARE_BASE}/hero_bg.png)`, backgroundSize: "520px auto" }}
      />
    </div>
  );
}

const team: TeamMember[] = [
  {
    name: "Shuja Rehman",
    role: "Founder & CEO",
    description: "Leads vision, community, and the direction of the platform.",
    initial: "SR",
    imageSrc: whoWeAreImg("Shuja.png"),
    tags: ["Vision", "Community", "Strategy"],
    footerIcon: Users,
    photoObjectClass:
      "object-cover object-[50%_10%] scale-[1.08] sm:scale-[1.06] [transform-origin:50%_24%]",
  },
  {
    name: "Ritik Raj",
    role: "Co-Founder & CTO",
    description: "Leads engineering and platform infrastructure.",
    initial: "RR",
    imageSrc: whoWeAreImg("Ritik.png"),
    tags: ["Engineering", "Platform", "Systems"],
    footerIcon: Code2,
    photoObjectClass:
      "object-cover object-[50%_10%] scale-[1.08] sm:scale-[1.06] [transform-origin:50%_24%]",
  },
  {
    name: "Arnav Singh",
    role: "Co-Founder & CPO",
    description: "Leads the development and experience of students and mentors.",
    initial: "AS",
    imageSrc: whoWeAreImg("Arnav.png"),
    tags: ["Product", "Experience", "Growth"],
    footerIcon: Heart,
    photoObjectClass:
      "object-cover object-[50%_8%] scale-[1.06] sm:scale-[1.04] [transform-origin:50%_20%]",
  },
];

const timeline = [
  {
    year: "2019",
    title: "The Beginning",
    description:
      "Started in a thesis room at Faculty of Architecture and Ekistics, Jamia Millia Islamia. Shuja Rehman's unconventional seaplane-based airport thesis revealed the scattered nature of architectural knowledge.",
    icon: MapPin,
  },
  {
    year: "2020",
    title: "First Sessions",
    description:
      "Open sessions for juniors on thesis fundamentals. Students who'd been quietly stuck started showing up.",
    icon: MessageCircle,
  },
  {
    year: "2021",
    title: "Community Growth",
    description:
      "A WhatsApp group sharing architectural opportunities grew from a handful to nearly 400 students, colleagues, and practitioners.",
    icon: Users,
  },
  {
    year: "2024",
    title: "The Limits",
    description:
      "WhatsApp groups don't scale. Mentors burn out. Students with the right contacts find answers; students without them don't.",
    icon: TrendingUp,
  },
  {
    year: "2026",
    title: "Commonsia Today",
    description:
      "Verified mentors, structured sessions, fair compensation, honest feedback. The same generosity — now with infrastructure to reach every architecture student.",
    icon: Rocket,
  },
];

const beliefs = [
  {
    title: "Access over luck",
    description:
      "A career shouldn't be decided by who you happen to know. The right senior at the right moment shouldn't be a matter of luck.",
    icon: Users,
  },
  {
    title: "Beyond the studio",
    description:
      "The most important conversations in architecture happen outside the studio. A jury teaches you to defend a project. A mentor teaches you to build a life around one.",
    icon: MessageCircle,
  },
  {
    title: "Structure sustains generosity",
    description:
      "Generosity needs structure to last. Mentors give their time, their experience, their honesty. Our job is to make that worth their while — every single time.",
    icon: Heart,
  },
];

/** Marketing body only — `MarketingShell` supplies global Navbar + SiteFooter. */
export function WhoWeArePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative min-h-[calc(100svh-4.5rem)] overflow-hidden bg-white px-6 py-10 sm:py-12 md:py-14">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <SoftGrid />
        </div>
        <div className="relative mx-auto flex h-full max-w-6xl flex-col items-center justify-center gap-6 pt-16 text-center sm:pt-20 md:pt-24">
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto text-4xl font-semibold leading-[0.98] tracking-tight text-black sm:text-5xl md:text-6xl lg:text-7xl"
          >
            <span className="block whitespace-normal sm:whitespace-nowrap">
              <span className="text-primary">Commonsia</span> is where architecture
            </span>
            <span className="block whitespace-normal sm:whitespace-nowrap">
              students find the <span className="text-primary">answers</span> their
            </span>
            <span className="block whitespace-normal sm:whitespace-nowrap">colleges can&apos;t give them.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-2xl text-pretty text-sm leading-relaxed text-neutral-600 sm:text-base md:text-lg"
          >
            We connect architecture students with mentors for portfolio reviews, career conversations, design crits, and
            honest guidance.
          </motion.p>
        </div>
      </section>

      {/* Timeline */}
      <section id="our-journey" className="scroll-mt-28 bg-white px-6 py-14 sm:py-18 md:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionReveal className="mb-10 text-center sm:mb-12">
            <h2 className="mb-4 text-3xl font-bold leading-tight text-gray-900 md:text-4xl lg:text-5xl">
              The Story Behind Commonsia
            </h2>
            <p className="mx-auto max-w-3xl text-lg text-gray-600 md:text-xl">
              From a thesis room to a movement that&apos;s reshaping architectural education
            </p>
          </SectionReveal>

          <div className="relative">
            <div
              className="absolute bottom-0 left-8 top-0 w-0.5 bg-gradient-to-b from-neutral-200 via-neutral-200 to-transparent md:left-1/2 md:-translate-x-1/2"
              aria-hidden
            />

            <div className="space-y-12">
              {timeline.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.year + item.title}
                    className={`relative flex items-center ${index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
                  >
                    <div className="absolute left-8 z-10 flex size-16 items-center justify-center rounded-full border border-black/[0.10] bg-white shadow-lg md:left-1/2 md:-translate-x-1/2">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
                        <Icon className="size-6 text-primary" aria-hidden />
                      </div>
                    </div>

                    <div
                      className={`ml-24 md:ml-0 md:w-5/12 ${index % 2 === 0 ? "md:mr-auto md:pr-16" : "md:ml-auto md:pl-16"}`}
                    >
                      <SectionReveal
                        delay={index * 0.04}
                        className="rounded-2xl border border-black/[0.08] bg-white p-6 shadow-sm transition-all hover:shadow-lg sm:p-8"
                      >
                        <span className="mb-4 inline-block rounded-full bg-primary px-4 py-1 text-sm font-bold text-white">
                          {item.year}
                        </span>
                        <h3 className="mb-3 text-xl font-bold text-gray-900 sm:text-2xl">{item.title}</h3>
                        <p className="leading-relaxed text-gray-600">{item.description}</p>
                      </SectionReveal>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Beliefs */}
      <section id="beliefs" className="scroll-mt-28 bg-white px-6 py-14 sm:py-18 md:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionReveal className="mb-10 text-center sm:mb-12">
            <h2 className="text-3xl font-bold leading-tight text-gray-900 md:text-4xl lg:text-5xl">What We Believe</h2>
          </SectionReveal>

          <div className="grid gap-8 md:grid-cols-3">
            {beliefs.map((belief, idx) => {
              const Icon = belief.icon;
              return (
                <SectionReveal key={belief.title} delay={idx * 0.05} className="group relative">
                  <div className="h-full rounded-2xl border border-black/[0.08] bg-white p-8 shadow-sm transition-all group-hover:-translate-y-1.5 group-hover:shadow-xl">
                    <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm transition-all group-hover:scale-[1.03] group-hover:bg-primary group-hover:text-white">
                      <Icon className="size-7" aria-hidden />
                    </div>
                    <h3 className="mb-4 text-xl font-bold text-gray-900 sm:text-2xl">{belief.title}</h3>
                    <p className="leading-relaxed text-gray-600">{belief.description}</p>
                  </div>
                </SectionReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="scroll-mt-28 bg-white px-6 py-14 sm:py-18 md:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionReveal className="mb-10 text-center sm:mb-12 md:mb-14">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Our team</p>
            <h2 className="text-3xl font-bold leading-tight text-gray-900 md:text-4xl lg:text-5xl">Meet the Team</h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-neutral-600 md:text-lg">
              Architects, technologists and builders — committed to creating a mentorship platform that empowers the
              next generation of architects.
            </p>
          </SectionReveal>

          <div className="mb-12 grid grid-cols-1 items-start gap-8 sm:grid-cols-2 md:grid-cols-3 md:gap-6 lg:gap-8">
            {team.map((member, idx) => {
              const FooterIcon = member.footerIcon;
              return (
                <SectionReveal
                  key={member.name}
                  delay={idx * 0.05}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative isolate h-[16.5rem] w-full shrink-0 overflow-hidden sm:h-[17.5rem] md:h-[18.25rem] lg:h-[19rem]">
                    <TeamCardPhotoBackdrop />
                    <div className="absolute inset-0">
                      <div className="relative h-full w-full">
                        <Image
                          src={member.imageSrc}
                          alt={member.name}
                          fill
                          sizes="(min-width: 1024px) 340px, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className={`drop-shadow-[0_6px_18px_rgba(0,0,0,0.12)] ${member.photoObjectClass ?? "object-cover object-[50%_18%]"}`}
                          priority={idx < 2}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-none flex-col px-5 py-4 sm:px-5 sm:py-5 md:px-6">
                    <h3 className="text-lg font-bold tracking-tight text-neutral-950 sm:text-xl">{member.name}</h3>
                    <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-primary sm:text-xs">
                      {member.role}
                    </p>
                    <p className="mt-2.5 text-sm leading-relaxed text-neutral-600 sm:mt-3 sm:text-[0.9375rem]">
                      {member.description}
                    </p>
                    <div className="mt-3 flex items-start gap-2.5 border-t border-neutral-100 pt-3.5 sm:mt-4 sm:pt-4">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                        <FooterIcon className="size-3.5" aria-hidden strokeWidth={2.25} />
                      </span>
                      <p className="text-left text-xs font-medium leading-snug text-neutral-600 sm:text-sm">
                        {member.tags.join(" • ")}
                      </p>
                    </div>
                  </div>
                </SectionReveal>
              );
            })}
          </div>

          <SectionReveal className="rounded-2xl border border-black/[0.08] bg-neutral-50 p-8 text-center shadow-sm">
            <Award className="mx-auto mb-4 size-11 text-black" aria-hidden />
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-gray-700">
              Backed by a circle of{" "}
              <span className="font-semibold text-gray-900">
                architecture-industry advisors, practising principals, design educators, and researchers.
              </span>
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Future */}
      <section id="future" className="scroll-mt-28 bg-white px-6 py-14 sm:py-18 md:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionReveal className="mb-10 text-center sm:mb-12">
            <h2 className="mb-4 text-3xl font-bold leading-tight text-gray-900 md:text-4xl lg:text-5xl">
              Where We&apos;re Going
            </h2>
          </SectionReveal>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-black/[0.08] bg-white p-8 shadow-sm transition-all hover:shadow-xl">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                  <Calendar className="size-6" aria-hidden />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Today</h3>
              </div>
              <p className="mb-4 leading-relaxed text-gray-600">
                B.Arch students. Verified mentors. A model that works, proven in India.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-block rounded-full bg-black/5 px-3 py-1 text-sm font-medium text-neutral-700">
                  Active
                </span>
                <span className="inline-block rounded-full bg-black/5 px-3 py-1 text-sm font-medium text-neutral-700">
                  Growing
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-black/[0.08] bg-white p-8 shadow-sm transition-all hover:shadow-xl">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                  <TrendingUp className="size-6" aria-hidden />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Tomorrow</h3>
              </div>
              <p className="leading-relaxed text-gray-600">
                The full design ecosystem. Interior design. Urban planning. Landscape. Product design. The same
                scattered goodwill, waiting to be organised.
              </p>
            </div>

            <div className="rounded-2xl border border-black/[0.08] bg-white p-8 shadow-sm transition-all hover:shadow-xl">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                  <Globe className="size-6" aria-hidden />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">The Vision</h3>
              </div>
              <p className="leading-relaxed text-gray-600">
                To become the place where an architecture career actually happens. Where guidance flows freely, where
                talent is nurtured, and where a century-old profession finally has the network it deserves.
              </p>
            </div>
          </div>

          <SectionReveal className="mt-10 rounded-2xl border border-black/[0.08] bg-white p-8 shadow-sm sm:p-10">
            <h3 className="mb-6 text-center text-xl font-bold text-gray-900 sm:text-2xl">
              A network the profession has been waiting a century for
            </h3>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 size-6 shrink-0 text-primary" aria-hidden />
                  <p className="text-gray-700">
                    Where a sixteen-year-old curious about the field finds her first mentor
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 size-6 shrink-0 text-primary" aria-hidden />
                  <p className="text-gray-700">Where a third-year lands the right internship</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 size-6 shrink-0 text-primary" aria-hidden />
                  <p className="text-gray-700">
                    Where a graduate chooses between a master&apos;s abroad and a practice in Mumbai through a real
                    conversation, not a Reddit thread
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 size-6 shrink-0 text-primary" aria-hidden />
                  <p className="text-gray-700">
                    Where a working architect, ten years in, gives back to the profession — and is valued for it
                  </p>
                </div>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative mb-10 overflow-hidden bg-neutral-950 px-6 py-12 sm:mb-14 sm:py-14 md:mb-16 md:py-16">
        <div className="pointer-events-none absolute inset-0 opacity-25" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:54px_54px]" />
          <div className="absolute left-1/2 top-[-16rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        </div>

        <SectionReveal className="relative z-10 mx-auto max-w-4xl text-center text-white" delay={0.04}>
          <Rocket className="mx-auto mb-6 size-11 text-white/90 sm:size-12" aria-hidden />
          <h2 className="text-balance text-2xl font-black leading-tight sm:text-3xl md:text-4xl">
            We&apos;re building it.
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-pretty text-sm leading-relaxed text-white/80 sm:text-base md:text-lg">
            Join us in reshaping architectural education — with real mentors, real conversations, and the structure to
            make guidance accessible.
          </p>
          <div className="mt-7 flex justify-center">
            <Link
              href="/auth"
              className="rounded-xl bg-white px-8 py-3 text-sm font-bold text-neutral-950 shadow-2xl transition-all hover:scale-[1.02] hover:bg-neutral-100 sm:px-10 sm:py-3.5 sm:text-base"
            >
              Join Commonsia
            </Link>
          </div>
        </SectionReveal>
      </section>
    </div>
  );
}
