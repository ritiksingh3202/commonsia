"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

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
  const { data: session, status } = useSession();
  const authed = status === "authenticated";
  const loading = status === "loading";
  const dashboardHref = session?.user?.role === "mentor" ? "/mentor" : "/student";

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    startTransition(() => {
      setMenuOpen(false);
    });
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-[#ffffff]">
      <div className="relative z-[100] mx-auto flex min-w-0 max-w-7xl items-center justify-between gap-2 bg-[#ffffff] px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3 lg:px-8">
        <Link
          href="/"
          className="relative z-10 block w-[min(46vw,200px)] shrink-0"
        >
          <Image
            src="/logo.svg"
            alt="Commonsia"
            width={220}
            height={43}
            className="h-8 w-auto sm:h-10"
            priority
          />
        </Link>

        <motion.nav
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-black/[0.08] bg-[#ffffff] px-2 py-1.5 text-[15px] text-ink shadow-sm md:flex lg:gap-1 lg:px-4"
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

        <div className="relative z-10 flex min-w-0 shrink-0 items-center justify-end gap-1.5 sm:gap-3">
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
              className="h-9 w-[4.5rem] shrink-0 animate-pulse rounded-full bg-neutral-200/90 sm:h-10 sm:w-32"
              aria-hidden
            />
          ) : null}
          {!loading && authed ? (
            <Link
              href={dashboardHref}
              className="hidden rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] sm:inline-flex sm:px-8 sm:py-2.5 sm:text-sm"
            >
              <span className="max-w-[7rem] truncate sm:max-w-none">My profile</span>
            </Link>
          ) : null}
          {!loading && !authed ? (
            <Link
              href="/auth"
              className="hidden rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] sm:inline-flex sm:px-8 sm:py-2.5 sm:text-sm"
            >
              <span className="sm:hidden">Login</span>
              <span className="hidden sm:inline">Login/Register</span>
            </Link>
          ) : null}
          <button
            type="button"
            className="flex shrink-0 items-center justify-center p-2 transition-opacity hover:opacity-70 active:opacity-50 md:hidden -mr-2"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-[100] overflow-hidden border-t border-black/[0.06] bg-[#ffffff] shadow-[0_12px_24px_-8px_rgba(0,0,0,0.08)] md:hidden"
            >
              <nav
                className="flex max-h-[min(70vh,calc(100dvh-8rem))] flex-col gap-0.5 overflow-y-auto px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2"
                aria-label="Mobile"
              >
                <Link
                  href="/"
                  className="rounded-xl px-3 py-3 text-[15px] font-normal text-ink hover:bg-neutral-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Home
                </Link>
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-xl px-3 py-3 text-[15px] hover:bg-neutral-50 ${
                      isActive(pathname, item.href) ? "font-semibold text-primary" : "font-normal text-ink"
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/mentors"
                  className="flex items-center gap-2 rounded-xl px-3 py-3 text-[15px] font-normal text-ink hover:bg-neutral-50"
                  onClick={() => setMenuOpen(false)}
                >
                  <Image src="/mentors_assets/search.svg" alt="" width={20} height={20} className="size-5 opacity-80" />
                  Search mentors
                </Link>
                {!loading && (
                  <Link
                    href={authed ? dashboardHref : "/auth"}
                    className="mt-2 rounded-xl bg-primary px-3 py-3.5 text-center text-[15px] font-semibold text-white shadow-sm"
                    onClick={() => setMenuOpen(false)}
                  >
                    {authed ? "My profile" : "Login / Register"}
                  </Link>
                )}
              </nav>
            </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
