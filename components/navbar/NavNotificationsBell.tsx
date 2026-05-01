"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  type:
    | "message_request"
    | "message_waiting"
    | "booking_declined"
    | "message_accepted"
    | "session_booked";
  title: string;
  subtitle: string | null;
  href: string;
  threadId?: string;
  canAccept?: boolean;
  canDecline?: boolean;
};

/** Slightly longer interval reduces background work on tab-heavy sessions. */
const POLL_MS = 45_000;
/**
 * Minimum time between real network calls. Because <Navbar/> is rendered inside
 * per-route shells (MarketingShell / dashboard layouts), every navigation unmounts
 * and remounts this component. Without this TTL, each navigation would fire a new
 * summary request. The TTL is shorter than POLL_MS so freshness is preserved.
 */
const CACHE_TTL_MS = 20_000;

type CachedSummary = { totalCount: number; items: NotificationItem[]; ts: number };
let sharedCache: CachedSummary | null = null;
let inFlight: Promise<CachedSummary | null> | null = null;

async function fetchSummary(): Promise<CachedSummary | null> {
  try {
    const res = await fetch("/api/notifications/summary", { cache: "no-store" });
    if (!res.ok) {
      /**
       * Cache the empty state on auth errors too — otherwise every nav remount fires a fresh
       * 401 since `sharedCache` stayed null. `CACHE_TTL_MS` still lets us re-check later.
       */
      if (res.status === 401 || res.status === 403) {
        const empty: CachedSummary = { totalCount: 0, items: [], ts: Date.now() };
        sharedCache = empty;
        return empty;
      }
      return null;
    }
    const data = (await res.json()) as { totalCount?: number; items?: NotificationItem[] };
    const next: CachedSummary = {
      totalCount: typeof data.totalCount === "number" ? data.totalCount : 0,
      items: Array.isArray(data.items) ? data.items : [],
      ts: Date.now(),
    };
    sharedCache = next;
    return next;
  } catch {
    return null;
  }
}

export function NavNotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>(() => sharedCache?.items ?? []);
  const [total, setTotal] = useState<number>(() => sharedCache?.totalCount ?? 0);
  const [loading, setLoading] = useState<boolean>(() => sharedCache === null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (reason = "unknown") => {
    const now = Date.now();
    const forceRefresh = reason === "manual";
    if (!forceRefresh && sharedCache && now - sharedCache.ts < CACHE_TTL_MS) {
      setTotal(sharedCache.totalCount);
      setItems(sharedCache.items);
      setLoading(false);
      return;
    }
    if (inFlight) {
      const result = await inFlight;
      if (result) {
        setTotal(result.totalCount);
        setItems(result.items);
      }
      setLoading(false);
      return;
    }
    const p = fetchSummary();
    inFlight = p;
    try {
      const result = await p;
      if (result) {
        setTotal(result.totalCount);
        setItems(result.items);
      }
    } finally {
      inFlight = null;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("mount");
    const id = window.setInterval(() => void load("interval"), POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void load("visibility");
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    void load("dropdown-open");
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const onAct = async (threadId: string, action: "accept" | "decline") => {
    const res = await fetch(`/api/chat/threads/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) return;
    await load("manual");
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#0a0a0a] shadow-sm transition hover:border-primary/30 hover:bg-neutral-50 sm:size-10"
      >
        <BellIcon className="size-[1.15rem] sm:size-5" />
        {!loading && total > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {total > 9 ? "9+" : total}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[120] w-[min(calc(100vw-1.5rem),20rem)] rounded-xl border border-black/[0.08] bg-white py-2 shadow-xl ring-1 ring-black/5"
          role="menu"
        >
          <div className="border-b border-neutral-100 px-3 pb-2 pt-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Notifications</p>
          </div>
          <div className="max-h-[min(70vh,22rem)] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-neutral-500">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-neutral-500">You&apos;re all caught up.</p>
            ) : (
              <ul className="py-1">
                {items.map((it) => (
                  <li key={it.id} className="border-b border-neutral-50 last:border-b-0">
                    <Link
                      href={it.href}
                      role="menuitem"
                      className="block px-3 py-2.5 transition hover:bg-neutral-50"
                      onClick={() => setOpen(false)}
                    >
                      <p className="text-[13px] font-semibold leading-snug text-[#0a0a0a]">{it.title}</p>
                      {it.subtitle ? (
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-neutral-600">{it.subtitle}</p>
                      ) : null}
                    </Link>
                    {it.threadId && it.canAccept && it.canDecline ? (
                      <div className="flex gap-2 px-3 pb-2.5">
                        <button
                          type="button"
                          className="flex-1 rounded-lg bg-primary py-1.5 text-[11px] font-semibold text-white transition hover:bg-primary/90"
                          onClick={() => void onAct(it.threadId!, "accept")}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="flex-1 rounded-lg border border-neutral-200 bg-white py-1.5 text-[11px] font-semibold text-[#0a0a0a] transition hover:bg-neutral-50"
                          onClick={() => void onAct(it.threadId!, "decline")}
                        >
                          Decline
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-neutral-100 px-2 py-2">
            <Link
              href="/messages"
              className="block rounded-lg py-2 text-center text-[12px] font-semibold text-primary hover:bg-primary/5"
              onClick={() => setOpen(false)}
            >
              Open messages
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7M13.73 21a2 2 0 01-3.46 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
