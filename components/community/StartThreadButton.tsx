"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { FORUM_CATEGORIES } from "@/lib/forum-categories";

const MAX_BODY = 2000;

export function StartThreadButton({
  userId,
  callbackUrl = "/community",
}: {
  userId: string | null;
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleOpen() {
    if (!userId) {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }
    setOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function handleClose() {
    if (submitting) return;
    setOpen(false);
    setBody("");
    setCategory(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body.trim(), category }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      handleClose();
      router.push(`/community/post/${data.id}`);
    } catch {
      setError("Could not post. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary/90 active:scale-95"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
          <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Start Thread
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-[#0a0a0a]">Start a Discussion</h2>
              <button
                onClick={handleClose}
                disabled={submitting}
                className="grid size-7 place-items-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4">
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={MAX_BODY}
                rows={5}
                placeholder="What's on your mind? Share a question, insight, or resource…"
                className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-[14px] leading-relaxed text-[#1f2937] placeholder:text-neutral-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1 text-right text-[11px] text-neutral-400">
                {body.length}/{MAX_BODY}
              </p>

              <div className="mt-3">
                <p className="mb-2 text-[12px] font-medium text-neutral-500">Category (optional)</p>
                <div className="flex flex-wrap gap-2">
                  {FORUM_CATEGORIES.map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => setCategory(category === c.slug ? null : c.slug)}
                      className="rounded-full px-3 py-1 text-[12px] font-semibold transition"
                      style={
                        category === c.slug
                          ? { backgroundColor: c.accent, color: "#fff" }
                          : { backgroundColor: "#f3f4f6", color: "#374151" }
                      }
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="mt-3 text-[13px] text-red-600">{error}</p>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="rounded-full border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !body.trim()}
                  className="rounded-full bg-primary px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting ? "Posting…" : "Post Thread"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
