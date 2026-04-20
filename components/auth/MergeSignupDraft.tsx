"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

/** Applies name/role from the signup form (`sessionStorage`) right after OAuth or email sign-in. */
export function MergeSignupDraft() {
  const { status, update } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem("commonsia_signup_draft");
    } catch {
      return;
    }
    if (!raw?.trim()) return;

    let cancelled = false;
    /** Defer until after the browser has applied the session cookie from the OAuth redirect. */
    const timer = window.setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        try {
          const draft = JSON.parse(raw) as { name?: string; role?: string };
          const rolePatch =
            draft.role === "mentor" ? "mentor" : draft.role === "student" ? "student" : undefined;
          const res = await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: draft.name?.trim() || undefined,
              role: rolePatch,
            }),
          });
          if (cancelled) return;
          if (!res.ok) {
            const t = await res.text().catch(() => "");
            console.error("[MergeSignupDraft] profile PATCH failed", res.status, t.slice(0, 240));
            return;
          }
          try {
            sessionStorage.removeItem("commonsia_signup_draft");
          } catch {
            /* ignore */
          }
          await update();
        } catch (e) {
          if (!cancelled) console.error("[MergeSignupDraft]", e);
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [status, update]);

  return null;
}
