"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Top-of-page 2px loading bar that animates on every client-side navigation (and on anchor clicks
 * that request navigation). Gives users instant visual feedback the moment they click a link so
 * the app never feels frozen while the next RSC/page payload streams in.
 *
 * Strategy:
 *  1. Listen for clicks on same-origin `<a>` / `<Link>` elements and start the bar immediately.
 *  2. When the pathname/search actually changes, complete the bar.
 *  3. If nothing changed within ~4s (e.g. click was cancelled), fall back to hiding the bar.
 */
export function RouteProgressBar() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousKey = useRef<string>("");

  const stop = () => {
    if (trickleRef.current) {
      clearInterval(trickleRef.current);
      trickleRef.current = null;
    }
    if (fallbackRef.current) {
      clearTimeout(fallbackRef.current);
      fallbackRef.current = null;
    }
  };

  const finish = () => {
    stop();
    setProgress(100);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setActive(false);
      setProgress(0);
    }, 220);
  };

  const start = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    stop();
    setActive(true);
    setProgress(12);
    /** Trickle toward 85% while we wait for the new route to render. Never hits 100% until `finish()`. */
    trickleRef.current = setInterval(() => {
      setProgress((p) => (p < 85 ? p + Math.max(1, (90 - p) * 0.08) : p));
    }, 180);
    /** Safety net: if the target page never mounts (same URL click, anchor scroll, etc.), end the bar. */
    fallbackRef.current = setTimeout(finish, 4000);
  };

  useEffect(() => {
    previousKey.current = pathname ?? "";
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const key = pathname ?? "";
    if (previousKey.current !== key) {
      previousKey.current = key;
      void Promise.resolve().then(finish);
    }
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (anchor.target && anchor.target !== "" && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (/^(https?:)?\/\//i.test(href)) {
        try {
          const url = new URL(href, window.location.href);
          if (url.origin !== window.location.origin) return;
        } catch {
          return;
        }
      }
      if (href.startsWith("mailto:") || href.startsWith("tel:")) return;
      /** Pure in-page anchors don't trigger route changes — don't run the bar. */
      if (href.startsWith("#")) return;
      start();
    };

    const onSubmit = () => {
      // Keep a gentle start for form submits too; `finish()` fires when pathname updates.
      start();
    };

    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("submit", onSubmit, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      stop();
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[999] h-0.5"
      style={{ opacity: active ? 1 : 0, transition: "opacity 200ms ease" }}
    >
      <div
        className="h-full bg-primary shadow-[0_0_10px_rgba(249,115,22,0.55)]"
        style={{
          width: `${progress}%`,
          transition: progress === 0 ? "none" : "width 220ms ease",
        }}
      />
    </div>
  );
}
