"use client";

import { useEffect, useRef, useState } from "react";

import type { CommunityStats } from "@/lib/forum-feed";

const POLL_INTERVAL_MS = 60_000;
const COUNT_UP_DURATION_MS = 1200;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

function StatItem({
  label,
  value,
  primary,
}: {
  label: string;
  value: number;
  primary?: boolean;
}) {
  const display = useCountUp(value);
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 px-2">
      <span
        className="font-heading text-[2rem] font-semibold tabular-nums leading-none tracking-tight sm:text-[2.25rem]"
        style={{ color: primary ? "#ff6600" : "#0a0a0a" }}
      >
        {display.toLocaleString()}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400 sm:text-[12px]">
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
    <div className="overflow-hidden rounded-2xl border border-[#ffe8d0] bg-[#fff8f2] shadow-[0_4px_24px_-8px_rgba(255,102,0,0.12)]">
      <div className="flex items-stretch divide-x divide-[#ffe8d0] py-5 sm:py-6">
        <StatItem label="Mentors" value={stats.mentorCount} primary />
        <StatItem label="Students" value={stats.studentCount} />
        <StatItem label="Posts" value={stats.postCount} />
      </div>
    </div>
  );
}
