"use client";

import { useCallback, useEffect, useRef } from "react";

type ProfilePatch = Record<string, unknown>;

async function patchProfile(body: ProfilePatch): Promise<Response> {
  return fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Debounced PATCH to `/api/profile`. Merges partial updates without blocking the UI.
 * Surfaces auth loss (401); use `flushNow()` before a full PATCH + navigate so nothing is stuck in the queue.
 */
export function useProfileAutosave(debounceMs = 700) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<ProfilePatch | null>(null);
  const alerted401 = useRef(false);

  const flush = useCallback(async () => {
    const body = pending.current;
    pending.current = null;
    if (!body || Object.keys(body).length === 0) return;
    try {
      const res = await patchProfile(body);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn("[profile-autosave] PATCH failed", res.status, text.slice(0, 240));
        if (res.status === 401 && !alerted401.current && typeof window !== "undefined") {
          alerted401.current = true;
          window.alert(
            "Your sign-in session expired while editing. Refresh the page and sign in again so your profile can keep saving.",
          );
        }
      }
    } catch (err) {
      console.warn("[profile-autosave] network error", err);
    }
  }, []);

  const flushNow = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    await flush();
  }, [flush]);

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

  return { schedule, flushNow };
}
