"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { compressImageToDataUrl } from "@/lib/resize-image-client";
import {
  InstagramGlyph,
  LinkedInGlyph,
  SocialIconButton,
  WhatsAppGlyph,
} from "@/components/profile/ProfileSocialIcons";

import {
  formatStudentSubtitle,
  parseInterests,
  parseSoftwarePills,
  type StudentProfileUser,
} from "./student-profile-types";

const pill =
  "inline-flex items-center rounded-full bg-primary/95 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm ring-1 ring-primary/20 sm:text-xs";

type Props = {
  user: StudentProfileUser;
};

export function StudentProfileHero({ user: initial }: Props) {
  const router = useRouter();
  const [user, setUser] = useState(initial);
  const [busy, setBusy] = useState<null | "banner">(null);

  useEffect(() => {
    setUser(initial);
  }, [initial]);

  const bannerInputRef = useRef<HTMLInputElement>(null);

  const sync = useCallback(() => {
    router.refresh();
  }, [router]);

  const patch = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Save failed");
  }, []);

  const onBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file?.type.startsWith("image/")) return;
    setBusy("banner");
    try {
      const dataUrl = await compressImageToDataUrl(file, { maxEdge: 1600, quality: 0.82 });
      await patch({ bannerImageUrl: dataUrl });
      setUser((u) => ({ ...u, bannerImageUrl: dataUrl }));
      sync();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not update banner.");
    } finally {
      setBusy(null);
    }
  };

  const interests = parseInterests(user.interests);
  const software = parseSoftwarePills(user.softwareSkills);
  const subtitle = formatStudentSubtitle(user);
  const displayName = user.name?.trim() || user.email?.split("@")[0] || "Student";
  const avatarSrc = user.image?.trim() || null;
  const bannerSrc = user.bannerImageUrl?.trim() || null;

  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="border-b border-black/[0.06] bg-white">
      {/* Full-viewport-width cover — bleeds edge to edge */}
      <div className="relative w-full overflow-x-hidden">
        <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2">
          <div className="relative h-[clamp(11rem,32vw,18rem)] w-full overflow-hidden sm:h-[clamp(12rem,28vw,17rem)]">
            {bannerSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URLs from user uploads
              <img src={bannerSrc} alt="" className="h-full w-full object-cover object-center" />
            ) : (
              <div
                className="flex h-full w-full items-end justify-center bg-gradient-to-br from-[#0c3d35] via-[#157a66] to-[#0a3028] pb-6 opacity-[0.98]"
                aria-hidden
              >
                <div className="pointer-events-none flex gap-10 opacity-[0.22]">
                  <span className="text-5xl text-white sm:text-6xl">◆</span>
                  <span className="text-5xl text-white sm:text-6xl">▣</span>
                  <span className="text-5xl text-white sm:text-6xl">◉</span>
                </div>
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent pointer-events-none sm:h-20" />
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => bannerInputRef.current?.click()}
              className="absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-full border border-white/30 bg-white/95 px-3 py-2 text-[12px] font-medium text-[#0a0a0a] shadow-lg backdrop-blur-sm transition hover:bg-white disabled:opacity-60 sm:bottom-5 sm:right-6 sm:px-3.5"
              aria-label="Edit cover photo"
            >
              {busy === "banner" ? (
                <span className="size-4 animate-pulse rounded-full bg-primary/60" />
              ) : (
                <PencilIcon className="size-[15px] sm:size-4" />
              )}
              <span className="hidden sm:inline">Edit cover</span>
            </button>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onBannerFile}
            />
          </div>
        </div>
      </div>

      {/* Identity + bio — readable column width */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-0 sm:px-6 sm:pb-10 lg:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10 lg:gap-12">
          {/* Avatar + edit */}
          <div className="-mt-[4.5rem] flex shrink-0 justify-center sm:-mt-[5.25rem] sm:justify-start">
            <div className="relative">
              <div className="relative size-[7.75rem] overflow-hidden rounded-full bg-neutral-100 ring-[5px] ring-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] sm:size-[9rem]">
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarSrc} alt="" className="size-full object-cover object-center" />
                ) : (
                  <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/12 to-primary/5 text-xl font-semibold text-primary sm:text-2xl">
                    {initials}
                  </div>
                )}
              </div>
              <Link
                href="/student/profile/edit?tab=personal"
                className="absolute -bottom-0.5 -right-0.5 z-10 flex size-10 items-center justify-center rounded-full border-2 border-white bg-white text-primary shadow-md ring-1 ring-black/[0.08] transition hover:bg-primary/5"
                aria-label="Edit profile"
                title="Edit profile"
              >
                <PencilIcon className="size-[18px]" />
              </Link>
            </div>
          </div>

          <div className="min-w-0 flex-1 pt-1 sm:pt-[4.75rem]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0 text-center sm:text-left">
                <h1 className="font-heading text-[1.35rem] font-semibold tracking-tight text-[#0a0a0a] sm:text-2xl lg:text-[1.75rem]">
                  {displayName}
                </h1>
                <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-[#5c5c66] sm:text-sm">
                  {subtitle}
                </p>
              </div>
              <div className="flex shrink-0 items-center justify-center gap-2.5 sm:justify-end sm:pt-1">
                <Link
                  href="/student/profile/edit"
                  className="flex size-11 items-center justify-center rounded-full border-2 border-primary bg-white text-primary shadow-sm transition hover:bg-primary/5 sm:size-10"
                  aria-label="Edit profile"
                  title="Edit profile"
                >
                  <PencilIcon className="size-[18px]" />
                </Link>
                <button
                  type="button"
                  className="flex size-11 items-center justify-center rounded-full bg-primary text-white shadow-md ring-1 ring-primary/20 transition hover:bg-primary/90 sm:size-10"
                  aria-label="Messages"
                >
                  <ChatBubbleIcon className="size-[18px]" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex justify-center gap-3 sm:justify-end">
              <SocialIconButton
                href={user.whatsappUrl}
                label="WhatsApp"
                icon={<WhatsAppGlyph />}
              />
              <SocialIconButton
                href={user.linkedinUrl}
                label="LinkedIn"
                icon={<LinkedInGlyph />}
              />
              <SocialIconButton
                href={user.instagramUrl}
                label="Instagram"
                icon={<InstagramGlyph />}
              />
            </div>

            {user.bio?.trim() && (
              <p className="mx-auto mt-5 max-w-2xl text-left text-[13px] leading-relaxed text-[#3e3e3e] sm:mx-0 sm:text-sm">
                {user.bio.trim()}
              </p>
            )}

            {(interests.length > 0 || user.otherInterests?.trim()) && (
              <div className="mt-6 text-left">
                <h2 className="text-sm font-semibold text-[#0a0a0a] sm:text-base">Interests and Skills</h2>
                {interests.length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {interests.map((tag) => (
                      <span key={tag} className={pill}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                {user.otherInterests?.trim() ? (
                  <p className="mt-3 text-[13px] leading-relaxed text-[#4b5563] sm:text-sm">
                    <span className="font-medium text-[#0a0a0a]">Other interests: </span>
                    {user.otherInterests.trim()}
                  </p>
                ) : null}
              </div>
            )}

            {software.length > 0 && (
              <div className="mt-5 text-left">
                <h2 className="text-sm font-semibold text-[#0a0a0a] sm:text-base">Software Skills</h2>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {software.map((tag) => (
                    <span key={tag} className={pill}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
