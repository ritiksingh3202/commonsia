import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { ReplyBox } from "@/components/community/ReplyBox";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { categoryMeta } from "@/lib/forum-categories";
import { getForumPost, getForumReplies } from "@/lib/forum-feed";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function Avatar({ name, image, size = 40 }: { name: string | null; image: string | null; size?: number }) {
  const initials = (name ?? "C").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (image) {
    return (
      <Image
        src={image}
        alt={name ?? ""}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

export default async function ThreadDetailPage({ params }: Props) {
  const { id } = await params;
  const [post, replies, session] = await Promise.all([
    getForumPost(id),
    getForumReplies(id),
    auth(),
  ]);

  if (!post) notFound();

  const userId = session?.user?.id ?? null;
  const callbackUrl = `/community/post/${id}`;
  const catMeta = post.category ? categoryMeta(post.category) : null;

  return (
    <MarketingShell>
      <div className="bg-[#fafafa] pb-16 pt-8 sm:pt-10">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <Link
            href="/community"
            className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 transition hover:text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Community Forum
          </Link>

          {/* Original post */}
          <article className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 px-5 pt-5">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={post.author.name} image={post.author.image} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#0a0a0a]">
                    {post.sourceLabel ?? post.author.name ?? "Commonsia"}
                  </p>
                  <p className="text-xs text-neutral-500">{formatRelative(post.postedAt)}</p>
                </div>
              </div>
              {catMeta && (
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white"
                  style={{ backgroundColor: catMeta.accent }}
                >
                  {catMeta.label}
                </span>
              )}
            </div>

            {post.imageUrl && (
              <div className="mt-3 bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.imageUrl} alt="" loading="lazy" className="h-auto max-h-[480px] w-full object-cover" />
              </div>
            )}

            {post.text?.trim() && (
              <div className="px-5 pb-5 pt-3">
                <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[#1f2937]">
                  {post.text}
                </p>
              </div>
            )}

            {post.sourceUrl && (
              <div className="flex items-center justify-end border-t border-black/[0.04] px-5 py-2.5">
                <Link
                  href={post.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] font-semibold text-primary hover:underline"
                >
                  Read on {post.sourceLabel ?? "source"} &rarr;
                </Link>
              </div>
            )}
          </article>

          {/* Replies */}
          <div className="mt-8">
            <h2 className="mb-4 text-[15px] font-semibold text-[#0a0a0a]">
              {replies.length === 0 ? "No replies yet" : `${replies.length} ${replies.length === 1 ? "Reply" : "Replies"}`}
            </h2>

            {replies.length > 0 && (
              <ul className="mb-6 flex flex-col gap-3">
                {replies.map((r) => (
                  <li key={r.id} className="flex gap-3 rounded-2xl border border-black/[0.06] bg-white px-5 py-4 shadow-sm">
                    <Avatar name={r.author.name} image={r.author.image} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-[#0a0a0a]">
                          {r.author.name ?? "Member"}
                        </span>
                        {r.author.role && (
                          <span className="text-[11px] font-medium capitalize text-neutral-400">
                            {r.author.role}
                          </span>
                        )}
                        <span className="ml-auto shrink-0 text-[11px] text-neutral-400">
                          {formatRelative(r.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[#1f2937]">
                        {r.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <ReplyBox postId={id} userId={userId} callbackUrl={callbackUrl} />
          </div>
        </div>
      </div>
    </MarketingShell>
  );
}
