"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

type Props = {
  editProfileHref: string;
  /** Match smaller icon buttons (e.g. mentor row uses size-10 only) */
  compact?: boolean;
};

/** Gear menu on own profile: edit profile + log out */
export function ProfileSettingsMenu({ editProfileHref, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  async function handleDeleteAccount() {
    if (
      !window.confirm(
        "Permanently delete your Commonsia account and all associated data? This cannot be undone.",
      )
    ) {
      return;
    }
    const typed = window.prompt('Type DELETE_MY_ACCOUNT to confirm.');
    if (typed !== "DELETE_MY_ACCOUNT") {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE_MY_ACCOUNT" }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        window.alert(j.error ?? "Could not delete account. Try again.");
        return;
      }
      setOpen(false);
      await signOut({ callbackUrl: "/" });
    } catch {
      window.alert("Could not delete account. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account settings"
        className={
          compact
            ? "flex size-10 items-center justify-center rounded-full border border-black/10 bg-white text-[#4b5563] shadow-sm transition hover:bg-neutral-50"
            : "flex size-11 items-center justify-center rounded-full border border-black/10 bg-white text-[#4b5563] shadow-sm transition hover:bg-neutral-50 sm:size-10"
        }
      >
        <GearIcon className="size-[18px]" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 min-w-[11rem] rounded-xl border border-black/[0.08] bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          <Link
            role="menuitem"
            href={editProfileHref}
            className="block px-3 py-2.5 text-[13px] font-medium text-[#0a0a0a] transition hover:bg-black/[0.04]"
            onClick={() => setOpen(false)}
          >
            Edit profile
          </Link>
          <button
            type="button"
            role="menuitem"
            className="w-full px-3 py-2.5 text-left text-[13px] font-medium text-[#b91c1c] transition hover:bg-red-50"
            onClick={() => void signOut({ callbackUrl: "/" })}
          >
            Log out
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={deleting}
            className="w-full border-t border-black/[0.06] px-3 py-2.5 text-left text-[13px] font-medium text-[#991b1b] transition hover:bg-red-50 disabled:opacity-50"
            onClick={() => void handleDeleteAccount()}
          >
            {deleting ? "Deleting…" : "Delete account"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
