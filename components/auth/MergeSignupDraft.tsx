"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

/** Applies name/role from the signup form (sessionStorage) right after OAuth. */
export function MergeSignupDraft() {
  const { status, update } = useSession();
  const ran = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || ran.current) return;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem("commonsia_signup_draft");
      if (!raw) return;
      ran.current = true;
      const draft = JSON.parse(raw) as { name?: string; role?: string };
      const role =
        draft.role === "mentor" ? "mentor" : draft.role === "student" ? "student" : undefined;
      void (async () => {
        try {
          const res = await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: draft.name?.trim() || undefined,
              role,
            }),
          });
          if (!res.ok) throw new Error("profile merge failed");
          try {
            sessionStorage.removeItem("commonsia_signup_draft");
          } catch {
            /* ignore */
          }
          await update();
        } catch {
          ran.current = false;
        }
      })();
    } catch {
      ran.current = false;
      if (raw) {
        try {
          sessionStorage.removeItem("commonsia_signup_draft");
        } catch {
          /* ignore */
        }
      }
    }
  }, [status, update]);

  return null;
}
