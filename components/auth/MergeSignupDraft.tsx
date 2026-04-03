"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

/** Applies name/role from the signup form (sessionStorage) right after OAuth. */
export function MergeSignupDraft() {
  const { status } = useSession();
  const ran = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || ran.current) return;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem("commonsia_signup_draft");
      if (!raw) return;
      ran.current = true;
      const draft = JSON.parse(raw) as { name?: string; role?: string };
      sessionStorage.removeItem("commonsia_signup_draft");
      const role =
        draft.role === "mentor" ? "mentor" : draft.role === "student" ? "student" : undefined;
      void fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name?.trim() || undefined,
          role,
        }),
      });
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
  }, [status]);

  return null;
}
