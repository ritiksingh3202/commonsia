"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { NavNotificationsBell } from "@/components/navbar/NavNotificationsBell";

const nav = [
  { href: "/mentors", label: "Mentors", prefetch: true },
  // Community RSC payload is large (~600KB); skip nav prefetch to avoid wasting bandwidth on
  // every page. The warm-cache cron keeps Redis hot so first paint is still fast.
  { href: "/community", label: "Community Forum", prefetch: false },
  { href: "/who-we-are", label: "Who We Are", prefetch: true },
  { href: "/contact", label: "Contact Us", prefetch: true },
];

function isActive(pathname: string, href: string) {
  if (href === "/mentors") return pathname === "/mentors";
  if (href === "/community") return pathname === "/community" || pathname.startsWith("/community/");
  if (href === "/who-we-are") return pathname === "/who-we-are";
  if (href === "/contact") return pathname === "/contact";
  return false;
}

/** Same-route click on Mentors should jump to the hero, not stay scrolled to the list/search. */
function scrollMentorsNavToTop(pathname: string, href: string) {
  if (href === "/mentors" && pathname === "/mentors") {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  /** Desktop profile dropdown — state-driven so taps work on touch tablets, not hover-only. */
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const authed = status === "authenticated";
  const loading = status === "loading";
  const role = session?.user?.role ?? null;
  /** OAuth users may have `role: null` until MergeSignupDraft — never default them to `/student`. */
  const dashboardHref =
    role === "mentor" ? "/mentor" : role === "student" ? "/student" : "/auth/continue";
  /**
   * "My profile" must not point at the URL you are already on (feels broken). On role home, go to edit profile.
   * Unknown role → `/auth/continue` so the server routes to setup or dashboard.
   */
  const myProfileHref =
    role === "mentor"
      ? pathname === "/mentor"
        ? "/mentor/profile/edit"
        : "/mentor"
      : role === "student"
        ? pathname === "/student"
          ? "/student/profile/edit"
          : "/student"
        : "/auth/continue";

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
      setProfileMenuOpen(false);
    });
  }, [pathname]);

  /** Close the desktop profile dropdown when clicking / tapping outside of it. */
  useEffect(() => {
    if (!profileMenuOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      const container = document.getElementById("nav-profile-menu-container");
      if (container && target && !container.contains(target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close, { passive: true });
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [profileMenuOpen]);

  /** Defer prefetches so first paint / hydration are not competing with background RSC fetches. */
  useEffect(() => {
    const id = window.setTimeout(() => {
      startTransition(() => {
        router.prefetch("/mentors");
        router.prefetch("/who-we-are");
        router.prefetch("/contact");
        router.prefetch("/auth");
      });
    }, 1200);
    return () => window.clearTimeout(id);
  }, [router]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const id = window.setTimeout(() => {
      startTransition(() => {
        void router.prefetch(dashboardHref);
        if (role === "student") void router.prefetch("/student/profile/edit");
        if (role === "mentor") void router.prefetch("/mentor/profile/edit");
        if (role == null) void router.prefetch("/auth/continue");
      });
    }, 1200);
    return () => window.clearTimeout(id);
  }, [router, session?.user, status, dashboardHref, role]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-black/[0.06] bg-[#ffffff]">
      <div className="relative z-[100] mx-auto flex min-w-0 max-w-7xl items-center justify-between gap-2 bg-[#ffffff] px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3 lg:px-8">
        <Link
          href="/"
          prefetch
          className="relative z-10 flex min-w-0 max-w-[min(72vw,280px)] shrink-0 items-center"
        >
          <BrandLogo priority />
        </Link>

        <motion.nav
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-black/[0.08] bg-[#ffffff] px-2 py-1.5 text-[15px] text-ink shadow-sm md:flex lg:gap-1 lg:px-4"
          aria-label="Main"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={item.prefetch}
              className={`rounded-full px-3 py-1.5 text-center font-normal transition-colors hover:text-primary lg:px-4 ${
                isActive(pathname, item.href) ? "font-semibold text-primary" : ""
              }`}
              onClick={() => scrollMentorsNavToTop(pathname, item.href)}
            >
              {item.label}
            </Link>
          ))}
        </motion.nav>

        <div className="relative z-10 flex min-w-0 shrink-0 items-center justify-end gap-1.5 sm:gap-3">
          {loading ? (
            <span
              className="h-9 w-[4.5rem] shrink-0 animate-pulse rounded-full bg-neutral-200/90 sm:h-10 sm:w-32"
              aria-hidden
            />
          ) : null}
          {!loading && authed ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <NavNotificationsBell />
              <div
                id="nav-profile-menu-container"
                className="relative hidden sm:inline-flex sm:items-center"
              >
                <Link
                  href={myProfileHref}
                  prefetch
                  className="inline-flex rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] sm:px-8 sm:py-2.5 sm:text-sm"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setProfileMenuOpen((v) => !v);
                  }}
                >
                  <span className="max-w-[7rem] truncate sm:max-w-none">My profile</span>
                </Link>
                <button
                  type="button"
                  aria-label={profileMenuOpen ? "Close account menu" : "Open account menu"}
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-[#334155] transition-colors hover:bg-neutral-100 active:bg-neutral-200 sm:h-10 sm:w-10"
                  onClick={() => setProfileMenuOpen((v) => !v)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {profileMenuOpen ? (
                  <div
                    className="absolute right-0 top-full z-[60] mt-1 min-w-[10rem] rounded-xl border border-black/[0.08] bg-white py-1 shadow-lg ring-1 ring-black/5"
                    role="menu"
                    aria-label="Account"
                  >
                    <Link
                      href={myProfileHref}
                      prefetch
                      role="menuitem"
                      className="block w-full px-3 py-2.5 text-left text-[13px] font-medium text-ink transition hover:bg-neutral-50"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      My profile
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-3 py-2.5 text-left text-[13px] font-medium text-[#b91c1c] transition hover:bg-red-50"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        void signOut({ callbackUrl: "/" });
                      }}
                    >
                      Log out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          {!loading && !authed ? (
            <Link
              href="/auth"
              prefetch
              className="hidden rounded-full bg-primary px-4 py-2 text-xs font-semibold tracking-wide text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] sm:inline-flex sm:px-7 sm:py-2.5 sm:text-sm"
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
                  prefetch
                  className="rounded-xl px-3 py-3 text-[15px] font-normal text-ink hover:bg-neutral-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Home
                </Link>
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={item.prefetch}
                    className={`rounded-xl px-3 py-3 text-[15px] hover:bg-neutral-50 ${
                      isActive(pathname, item.href) ? "font-semibold text-primary" : "font-normal text-ink"
                    }`}
                    onClick={() => {
                      scrollMentorsNavToTop(pathname, item.href);
                      setMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
                {!loading && (
                  <Link
                    href={authed ? myProfileHref : "/auth"}
                    prefetch
                    className="mt-2 rounded-xl bg-primary px-3 py-3.5 text-center text-[15px] font-semibold text-white shadow-sm"
                    onClick={() => setMenuOpen(false)}
                  >
                    {authed ? "My profile" : "Login / Register"}
                  </Link>
                )}
                {!loading && authed ? (
                  <button
                    type="button"
                    className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3 py-3 text-center text-[15px] font-semibold text-red-700 shadow-sm"
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut({ callbackUrl: "/" });
                    }}
                  >
                    Log out
                  </button>
                ) : null}
              </nav>
            </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
