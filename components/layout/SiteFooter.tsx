import Image from "next/image";
import Link from "next/link";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL, SITE_WHATSAPP_URL } from "@/lib/site-contact";

const explore = [
  { href: "/", label: "Home" },
  { href: "/mentors", label: "Mentors" },
  { href: "/who-we-are", label: "Who We Are" },
  { href: "/contact", label: "Contact Us" },
  { href: "/#faq", label: "FAQs" },
  { href: "/#community", label: "Testimonials" },
];

const legal = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
];

export function SiteFooter() {
  return (
    <footer className="bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)_minmax(0,0.85fr)] lg:items-start lg:gap-x-14 lg:gap-y-8 xl:gap-x-20">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="relative inline-flex min-w-0 max-w-full items-center">
              <BrandLogo context="footer" />
            </Link>
            <p className="mt-4 max-w-md text-justify text-xs leading-relaxed text-neutral-800 sm:text-[13px]">
              A collaborative platform for architecture students to connect with
              experienced mentors, ask questions, share ideas, and gain practical
              guidance. Learn from real experiences, explore insights from the
              community, and grow together as future architects.
            </p>
            <ul className="mt-5 flex flex-col gap-2.5 text-xs text-neutral-800">
              <li className="flex items-center gap-2.5">
                <Image
                  src="/home_assets/mail.svg"
                  alt=""
                  width={18}
                  height={18}
                  className="icon-black-line shrink-0"
                />
                <a href="mailto:hello@commonsia.com" className="hover:text-primary">
                  hello@commonsia.com
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Image
                  src="/home_assets/phone.svg"
                  alt=""
                  width={18}
                  height={18}
                  className="icon-black-line shrink-0"
                />
                <a href={`tel:${SITE_PHONE_TEL}`} className="hover:text-primary">
                  {SITE_PHONE_DISPLAY}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Image
                  src="/home_assets/location.svg"
                  alt=""
                  width={18}
                  height={18}
                  className="icon-black-line mt-0.5 shrink-0"
                />
                <span>IIT Roorkee, Roorkee 247667</span>
              </li>
            </ul>
            <div className="mt-5 flex gap-4">
              <a
                href={SITE_WHATSAPP_URL}
                className="transition-opacity hover:opacity-70"
                aria-label="WhatsApp"
              >
                <Image
                  src="/whatsapp.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="icon-black-line"
                />
              </a>
              <a
                href="https://linkedin.com/"
                className="transition-opacity hover:opacity-70"
                aria-label="LinkedIn"
              >
                <Image
                  src="/linkedin.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="icon-black-line"
                />
              </a>
              <a
                href="https://instagram.com/"
                className="transition-opacity hover:opacity-70"
                aria-label="Instagram"
              >
                <Image
                  src="/instagram.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="icon-black-line"
                />
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-black sm:text-base">Explore</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-neutral-800">
              {explore.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="font-normal hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-black sm:text-base">Legal</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-neutral-800">
              {legal.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="font-normal hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-black/10 pt-5 text-center text-[11px] text-neutral-700 sm:text-xs">
          © {new Date().getFullYear()} Commonsia. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
