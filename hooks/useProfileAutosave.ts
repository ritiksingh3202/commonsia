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
 * Surfaces auth loss (401).
 *
 * Serializes PATCHes: only one request is in flight at a time. If the user keeps typing while a save
 * is in flight, new fields accumulate into `pending` and are sent as a single merged PATCH once the
 * previous one returns. This prevents the Postgres connection pool from being hammered by many
 * parallel UPDATEs during fast typing — the previous "fire per debounce tick" behavior caused
 * 5+ concurrent writes that each had to wait on the DB, making saves feel slow.
 *
 * Before a canonical submit PATCH + navigate, call {@link cancelPending} (NOT `flushNow`) — the
 * canonical payload carries the full state, so flushing the debounced patch just wastes a round trip.
 * Keep `flushNow` for screens that don't send a canonical final PATCH (e.g. an edit page where the
 * user navigates away without hitting a "Save" button).
 */
export function useProfileAutosave(debounceMs = 700) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<ProfilePatch | null>(null);
  const alerted401 = useRef(false);
  const cancelledRef = useRef(false);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const flush = useCallback(async () => {
    /** If a request is already in flight, keep the accumulated patch and let the tail of the
     * in-flight promise drain it. No new network call is started here. */
    if (inFlightRef.current) {
      await inFlightRef.current;
      return;
    }
    const body = pending.current;
    pending.current = null;
    if (!body || Object.keys(body).length === 0) return;

    const run = (async () => {
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
    })();

    inFlightRef.current = run;
    try {
      await run;
    } finally {
      inFlightRef.current = null;
    }

    /** Drain anything that piled up while the request was in flight (single tail-call PATCH). */
    if (pending.current && Object.keys(pending.current).length > 0 && !cancelledRef.current) {
      await flush();
    }
  }, []);

  const flushNow = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    await flush();
  }, [flush]);

  /**
   * Kill the pending debounced PATCH without firing it. Use this before a canonical submit PATCH
   * so the redundant autosave request never goes out and can't race against the canonical write.
   */
  const cancelPending = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    pending.current = null;
    cancelledRef.current = true;
  }, []);

  const schedule = useCallback(
    (patch: ProfilePatch) => {
      cancelledRef.current = false;
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
      /** On unmount, only flush if the caller didn't explicitly cancel (e.g. just submitted a canonical PATCH). */
      if (!cancelledRef.current) void flush();
    };
  }, [flush]);

  return { schedule, flushNow, cancelPending };
}
