import Image from "next/image";
import Link from "next/link";

import { categoryMeta } from "@/lib/forum-categories";
import type { CommunityPost } from "@/lib/forum-feed";

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function linkify(text: string, links: string[]): React.ReactNode {
  if (!text.trim()) return null;
  if (links.length === 0) return text;
  const set = new Set(links);
  const parts: React.ReactNode[] = [];
  const re = /https?:\/\/[^\s]+/gi;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push(text.slice(last, idx));
    const raw = m[0];
    const trimmed = raw.replace(/[),.;!?]+$/g, "");
    const trail = raw.slice(trimmed.length);
    if (set.has(trimmed)) {
      parts.push(
        <a
          key={`l-${idx}`}
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-2 hover:underline"
        >
          {trimmed}
        </a>,
      );
      if (trail) parts.push(trail);
    } else {
      parts.push(raw);
    }
    last = idx + raw.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function AuthorAvatar({ name, image }: { name: string | null; image: string | null }) {
  const initials = (name ?? "C")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  if (image) {
    return (
      <Image
        src={image}
        alt={name ?? "Author"}
        width={40}
        height={40}
        className="size-10 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
      {initials}
    </div>
  );
}

export function CommunityFeed({ posts }: { posts: CommunityPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white px-6 py-10 text-center">
        <h2 className="text-base font-semibold text-[#0a0a0a]">No posts yet</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          New posts from Commonsia appear here as they&apos;re shared. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <ul className="mx-auto flex max-w-2xl flex-col gap-5">
      {posts.map((p) => (
        <li
          key={p.id}
          className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm"
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-4">
            <div className="flex min-w-0 items-center gap-3">
              <AuthorAvatar name={p.author.name} image={p.author.image} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#0a0a0a]">
                  {p.sourceLabel ? p.sourceLabel : p.author.name ?? "Commonsia"}
                </p>
                <p className="text-xs text-neutral-500">{formatRelative(p.postedAt)}</p>
              </div>
            </div>
            {p.category ? (
              (() => {
                const meta = categoryMeta(p.category);
                if (!meta) return null;
                return (
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white"
                    style={{ backgroundColor: meta.accent }}
                  >
                    {meta.label}
                  </span>
                );
              })()
            ) : null}
          </div>

          {p.imageUrl ? (
            <div className="mt-3 bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element -- external WhatsApp media URL, not optimized through next/image */}
              <img
                src={p.imageUrl}
                alt=""
                loading="lazy"
                className="h-auto w-full max-h-[640px] object-cover"
              />
            </div>
          ) : null}

          {p.text?.trim() ? (
            <div className="px-5 pb-4 pt-3">
              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#1f2937]">
                {linkify(p.text, p.links)}
              </p>
            </div>
          ) : null}

          {p.links.length > 0 && !p.text?.trim() ? (
            <ul className="px-5 pb-4 pt-3">
              {p.links.map((l) => (
                <li key={l}>
                  <Link
                    href={l}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-sm text-primary underline-offset-2 hover:underline"
                  >
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex items-center justify-between border-t border-black/[0.04] px-5 py-2.5">
            <Link
              href={`/community/post/${p.id}`}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-neutral-500 transition hover:text-primary"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path
                  d="M12 9a1 1 0 01-1 1H4l-2 2V3a1 1 0 011-1h8a1 1 0 011 1v6z"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinejoin="round"
                />
              </svg>
              {p.replyCount > 0 ? `${p.replyCount} ${p.replyCount === 1 ? "reply" : "replies"}` : "Reply"}
            </Link>

            {p.sourceUrl ? (
              <Link
                href={p.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] font-semibold text-primary hover:underline"
              >
                Read on {p.sourceLabel ?? "source"} &rarr;
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
