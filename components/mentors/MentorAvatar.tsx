"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { avatarColorsFromSeed, initialsFromDisplayName } from "@/lib/avatar-initials";
import { highResProfileImageUrl } from "@/lib/profile-image-url";

function isLocalPublicPath(src: string): boolean {
  if (!src.startsWith("/") || src.startsWith("//")) return false;
  /**
   * `/api/mentors/:id/photo?v={hash}` is the cache-bustable avatar proxy. It already streams a
   * properly sized, cache-controlled JPEG/PNG, so routing it through `next/image` just adds an
   * extra optimizer hop (and trips Next 16's `images.localPatterns` check for query strings).
   */
  if (src.startsWith("/api/mentors/")) return false;
  return true;
}

function isNextImageRemoteHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "media.licdn.com") return true;
  return /^lh[3-6]\.googleusercontent\.com$/i.test(h);
}

/** HTTPS avatars we allow through next/image (sharp resize + quality vs raw tiny OAuth URLs). */
function shouldOptimizeRemoteWithNext(src: string): boolean {
  try {
    const u = new URL(src);
    return u.protocol === "https:" && isNextImageRemoteHost(u.hostname);
  } catch {
    return false;
  }
}

type Props = {
  name: string;
  imageUrl: string;
  hasProfilePhoto: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
  variant?: "card" | "profile";
};

/**
 * Profile photo when available; otherwise WhatsApp-style initials on a soft solid color (stable per name).
 * Root is always `relative` + fills the parent — parent must set height (e.g. h-full min-h-[…]).
 */
export function MentorAvatar({
  name,
  imageUrl,
  hasProfilePhoto,
  className,
  sizes,
  priority,
  variant = "card",
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = initialsFromDisplayName(name);
  const colors = avatarColorsFromSeed(name);
  /** Card band is ≤320px wide; profile hero is ~184px. Keep CDN sources aligned so `next/image` does not over-fetch. */
  const maxEdge = variant === "profile" ? 400 : 320;
  const displaySrc = useMemo(() => highResProfileImageUrl(imageUrl, maxEdge), [imageUrl, maxEdge]);
  const showPhoto = hasProfilePhoto && imageUrl.trim().length > 0 && !imgFailed;
  const local = showPhoto && isLocalPublicPath(displaySrc);
  const remoteNext = showPhoto && !local && shouldOptimizeRemoteWithNext(displaySrc);

  return (
    <div
      className={`relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden ${className ?? ""}`}
      style={!showPhoto ? { backgroundColor: colors.bg, color: colors.fg } : undefined}
    >
      {showPhoto ? (
        local || remoteNext ? (
          <Image
            src={displaySrc}
            alt=""
            fill
            className="object-cover object-center"
            sizes={
              sizes ??
              (variant === "profile"
                ? "(max-width:640px) 42vw, 184px"
                : "(max-width:767px) 100vw, 320px")
            }
            /**
             * `quality` defaults to 75, which is the industry sweet spot for photographs.
             * The previous `95` forced Next.js to regenerate every avatar variant at near-
             * lossless quality — a ~240 KB card thumbnail where 75 produces ~60 KB with no
             * visible difference on an 80–320 px element.
             */
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            onError={() => setImgFailed(true)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- OAuth / data URLs / uncommon hosts
          <img
            src={displaySrc}
            alt=""
            className="h-full w-full min-h-[1px] object-cover object-center [image-rendering:auto]"
            onError={() => setImgFailed(true)}
          />
        )
      ) : (
        <span
          className="flex w-full select-none items-center justify-center px-2 font-semibold tracking-tight"
          style={{
            fontSize: variant === "profile" ? "clamp(2rem, 9vw, 3.5rem)" : "clamp(1.5rem, 5vw, 2.75rem)",
            lineHeight: 1,
          }}
          aria-hidden
        >
          {initials}
        </span>
      )}
    </div>
  );
}
