"use client";

import { useCallback, useEffect, useRef } from "react";

type ProfilePatch = Record<string, unknown>;

/**
 * Debounced PATCH to /api/profile. Merges partial updates without blocking the UI.
 */
export function useProfileAutosave(debounceMs = 900) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<ProfilePatch | null>(null);

  const flush = useCallback(async () => {
    const body = pending.current;
    pending.current = null;
    if (!body || Object.keys(body).length === 0) return;
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      /* non-blocking */
    }
  }, []);

  const schedule = useCallback(
    (patch: ProfilePatch) => {
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void flush();
      }, debounceMs);
    },
    [debounceMs, flush],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void flush();
    };
  }, [flush]);

  return schedule;
}
