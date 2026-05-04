"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const MAX_REPLY = 1000;

export function ReplyBox({
  postId,
  userId,
  callbackUrl,
}: {
  postId: string;
  userId: string | null;
  callbackUrl: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!userId) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-5 py-6 text-center">
        <p className="text-sm text-neutral-500">
          <a
            href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </a>{" "}
          to join the conversation.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/posts/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setBody("");
      router.refresh();
    } catch {
      setError("Could not post reply. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-neutral-200 bg-white p-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={MAX_REPLY}
        rows={3}
        placeholder="Write a reply…"
        className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-[14px] leading-relaxed text-[#1f2937] placeholder:text-neutral-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-neutral-400">{body.length}/{MAX_REPLY}</span>
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="rounded-full bg-primary px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? "Posting…" : "Reply"}
        </button>
      </div>
      {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
    </form>
  );
}
