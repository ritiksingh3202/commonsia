"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

const nav = [
  { href: "/mentors", label: "Mentors" },
  { href: "/#who-we-are", label: "Who We Are" },
  { href: "/contact", label: "Contact Us" },
];

function isActive(pathname: string, href: string) {
  if (href === "/mentors") return pathname === "/mentors";
  if (href === "/contact") return pathname === "/contact";
  return false;
}

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { status } = useSession();
  const authed = status === "authenticated";
  const loading = status === "loading";

  return (
    <header className="sticky top-0 z-50 border-b border-cream/80 bg-white/90 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="relative z-10 block h-9 w-[min(100%,200px)] shrink-0 sm:h-10 sm:w-[220px]"
        >
          <Image
            src="/logo.svg"
            alt="Commonsia"
            fill
            className="object-contain object-left"
            sizes="220px"
            priority
          />
        </Link>

        <motion.nav
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-cream px-2 py-1.5 text-[15px] text-ink md:flex lg:gap-1 lg:px-4"
          aria-label="Main"
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3 py-1.5 text-center font-normal transition-colors hover:text-primary lg:px-4 ${
                isActive(pathname, item.href) ? "font-semibold text-primary" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </motion.nav>

        <div className="relative z-10 ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            href="/mentors"
            className="hidden rounded-full border-2 border-primary p-2 text-primary transition-colors hover:bg-primary/5 sm:flex sm:items-center sm:justify-center"
            aria-label="Search mentors"
          >
            <Image
              src="/mentors_assets/search.svg"
              alt=""
              width={22}
              height={22}
              className="size-[22px]"
            />
          </Link>
          {loading ? (
            <span
              className="inline-block min-w-[10rem] rounded-full bg-neutral-200/80 px-8 py-2.5 text-sm font-semibold text-transparent"
              aria-hidden
            >
              …
            </span>
          ) : authed ? (
            <Link
              href="/student"
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] sm:px-8"
            >
              My profile
            </Link>
          ) : (
            <Link
              href="/auth"
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] sm:px-8"
            >
              Login/Register
            </Link>
          )}
          <button
            type="button"
            className="rounded-lg p-2 md:hidden"
            aria-expanded={menuOpen}
            aria-label="Menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="block h-0.5 w-6 bg-ink" />
            <span className="mt-1.5 block h-0.5 w-6 bg-ink" />
            <span className="mt-1.5 block h-0.5 w-6 bg-ink" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-cream md:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 py-3" aria-label="Mobile">
              <Link
                href="/"
                className="rounded-lg px-3 py-2.5 font-normal hover:bg-cream"
                onClick={() => setMenuOpen(false)}
              >
                Home
              </Link>
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2.5 hover:bg-cream ${
                    isActive(pathname, item.href) ? "font-semibold text-primary" : "font-normal"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {!loading && (
                <Link
                  href={authed ? "/student" : "/auth"}
                  className="mt-2 rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  {authed ? "My profile" : "Login/Register"}
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
