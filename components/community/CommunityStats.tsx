"use client";

import { useEffect, useRef, useState } from "react";

import type { CommunityStats } from "@/lib/forum-feed";

const POLL_INTERVAL_MS = 60_000;
const COUNT_UP_DURATION_MS = 1200;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animates a numeric counter from its previous value up to `target` over ~1.2s on first
 * paint, and on every change after that. Uses requestAnimationFrame so it stays smooth
 * without re-rendering React on every tick.
 */
function useCountUp(target: number): number {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    let raf = 0;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / COUNT_UP_DURATION_MS);
      const eased = easeOutCubic(t);
      const value = Math.round(fromRef.current + (targetRef.current - fromRef.current) * eased);
      setDisplay(value);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only re-run on target change
  }, [target]);

  return display;
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  const display = useCountUp(value);
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center rounded-2xl border border-black/[0.06] bg-white px-4 py-5 text-center shadow-sm">
      <span
        className="font-heading text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl"
        style={{ color: accent }}
      >
        {display.toLocaleString()}
      </span>
      <span className="mt-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500 sm:text-[13px]">
        {label}
      </span>
    </div>
  );
}

export function CommunityStatsStrip({ initial }: { initial: CommunityStats }) {
  const [stats, setStats] = useState<CommunityStats>(initial);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const r = await fetch("/api/community/stats", { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as CommunityStats;
        if (!cancelled) setStats(data);
      } catch {
        /* keep last-good values on transient failure */
      }
    };
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="mx-auto mb-8 grid max-w-2xl grid-cols-3 gap-3 sm:gap-4">
      <StatCard label="Mentors" value={stats.mentorCount} accent="#ea580c" />
      <StatCard label="Students" value={stats.studentCount} accent="#0a0a0a" />
      <StatCard label="Posts" value={stats.postCount} accent="#0a0a0a" />
    </div>
  );
}
