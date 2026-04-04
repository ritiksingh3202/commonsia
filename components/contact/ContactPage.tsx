"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { FaqAccordion } from "@/components/ui/FaqAccordion";
import { defaultFaqItems } from "@/lib/faq-content";
import { marketingImages } from "@/lib/marketing-images";

function IconDisc({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "dark" | "primary" | "outline" | "black";
}) {
  const base =
    "flex size-[72px] shrink-0 items-center justify-center rounded-full border-4 border-white shadow-inner";
  const styles = {
    dark: `${base} bg-white text-black shadow-[0_2px_12px_rgba(0,0,0,0.15)]`,
    primary: `${base} border-white/40 bg-white/25 text-white shadow-[0_2px_16px_rgba(0,0,0,0.12)] backdrop-blur-sm`,
    outline: `${base} border-primary/25 bg-white text-[#1a1a1a] shadow-[0_2px_12px_rgba(255,107,53,0.12)]`,
    black: `${base} bg-black text-white shadow-[0_2px_14px_rgba(0,0,0,0.22)]`,
  };
  return <div className={styles[variant]}>{children}</div>;
}

export function ContactPage() {
  return (
    <div className="bg-[#ffffff] pb-8">
      <section className="px-4 pt-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block rounded-[20px] bg-primary px-5 py-2 text-sm font-semibold text-white"
          >
            Let&apos;s Connect
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-heading-display mt-4 text-black"
          >
            We&apos;d love to hear from you!
          </motion.h1>
        </div>

        <div className="mx-auto mt-6 grid max-w-6xl gap-5 md:grid-cols-3">
          <motion.a
            href="mailto:admin@commonsia.com"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.99 }}
            className="flex flex-col items-center gap-5 rounded-[20px] border border-black/[0.08] bg-[#ffffff] px-8 py-9 text-center text-[#0a0a0a] shadow-sm"
          >
            <IconDisc variant="dark">
              <Image src="/contact_assets/mail.svg" alt="" width={36} height={36} />
            </IconDisc>
            <p className="text-xl text-neutral-700">Send a Message</p>
            <p className="text-xl font-semibold sm:text-2xl">admin@commonsia.com</p>
          </motion.a>

          <motion.a
            href="tel:+919876543210"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.99 }}
            className="flex flex-col items-center gap-5 rounded-[20px] border border-primary/35 bg-[#ffffff] px-8 py-9 text-center text-[#0a0a0a] shadow-sm"
          >
            <IconDisc variant="outline">
              <Image src="/contact_assets/phone.svg" alt="" width={36} height={36} />
            </IconDisc>
            <p className="text-xl text-neutral-700">Working Together ? Call now</p>
            <p className="text-xl font-semibold sm:text-2xl">+91 9876543210</p>
          </motion.a>

          <motion.div
            whileHover={{ y: -4 }}
            className="flex flex-col items-center gap-5 rounded-[20px] border border-black/[0.08] bg-[#ffffff] px-8 py-9 text-center shadow-sm"
          >
            <IconDisc variant="black">
              <Image src="/contact_assets/location.svg" alt="" width={36} height={36} />
            </IconDisc>
            <p className="text-xl text-black">Work Station</p>
            <p className="text-xl font-semibold text-black sm:text-2xl">DAP, IIT Roorkee</p>
          </motion.div>
        </div>
      </section>

      <SectionReveal className="mx-auto mt-8 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-black/[0.08] bg-[#ffffff] shadow-sm lg:grid lg:min-h-[min(520px,70vh)] lg:grid-cols-[2fr_3fr]">
          {/* ~40% — informational */}
          <div className="flex min-h-[300px] flex-col gap-4 border-b border-black/[0.06] p-5 text-[#0a0a0a] sm:p-5 lg:min-h-0 lg:border-b-0 lg:border-r lg:justify-between lg:gap-5 lg:p-6">
            <p className="text-heading-display text-left leading-snug text-ink">
              Have Questions? Our Experts Are Ready to Help
            </p>
            <div className="relative mx-auto h-[200px] w-full max-w-lg lg:mx-0 lg:mt-auto lg:h-[min(240px,30vh)] lg:max-w-none">
              <Image
                src={marketingImages.contactFormArt}
                alt=""
                fill
                className="object-contain object-bottom"
                sizes="(max-width:1024px) 100vw, 40vw"
              />
            </div>
          </div>
          {/* ~60% — form */}
          <div className="flex flex-col bg-[#ffffff] p-5 sm:p-5 lg:p-6">
            <h2 className="text-heading-display mb-4 text-left text-primary">
              Let&apos;s Talk
            </h2>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <label className="sr-only" htmlFor="c-name">
                Name
              </label>
              <input
                id="c-name"
                name="name"
                placeholder="Name"
                className="h-11 rounded-md border border-neutral-300 bg-white px-3 text-base text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[#FF511A] focus:ring-2 focus:ring-[#FF511A]/25"
              />
              <label className="sr-only" htmlFor="c-email">
                Email
              </label>
              <input
                id="c-email"
                name="email"
                type="email"
                placeholder="Email"
                className="h-11 rounded-md border border-neutral-300 bg-white px-3 text-base text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[#FF511A] focus:ring-2 focus:ring-[#FF511A]/25"
              />
              <label className="sr-only" htmlFor="c-msg">
                Message
              </label>
              <textarea
                id="c-msg"
                name="message"
                placeholder="Message"
                rows={5}
                className="min-h-[140px] resize-y rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-base text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[#FF511A] focus:ring-2 focus:ring-[#FF511A]/25"
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-1 w-full max-w-[200px] self-start rounded-md bg-[#FF511A] px-8 py-2.5 text-base font-semibold text-white sm:max-w-[30%] sm:min-w-[7.5rem]"
              >
                Send
              </motion.button>
            </form>
          </div>
        </div>
      </SectionReveal>

      <section
        id="faq"
        className="mt-8 scroll-mt-24 overflow-x-hidden bg-[#ffffff] px-4 pb-3 pt-3 sm:mt-10 sm:px-6 sm:pb-4 sm:pt-4 lg:px-8 lg:pb-5 lg:pt-5"
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
    </div>
  );
}
