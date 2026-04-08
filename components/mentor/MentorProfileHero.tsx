"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { MentorDashboardUser } from "@/components/mentor/mentor-dashboard-types";
import {
  InstagramGlyph,
  LinkedInGlyph,
  SocialIconButton,
  WhatsAppGlyph,
} from "@/components/profile/ProfileSocialIcons";
import { ProfileSettingsMenu } from "@/components/profile/ProfileSettingsMenu";
import { compressImageToDataUrl } from "@/lib/resize-image-client";

type Props = {
  user: MentorDashboardUser;
};

function mentorSubtitle(u: MentorDashboardUser): string {
  const title = u.mentorTitle?.trim();
  const company = u.mentorCompany?.trim();
  if (title && company) return `${title}, ${company}`;
  if (title) return title;
  if (company) return company;
  return "";
}

export function MentorProfileHero({ user: initial }: Props) {
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

  const displayName = user.name?.trim() || "Mentor";
  const subtitle = mentorSubtitle(user);
  const avatarSrc = user.image?.trim() || null;
  const bannerSrc = user.bannerImageUrl?.trim() || null;

  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hasSubtitle = Boolean(subtitle);

  return (
    <section className="border-b border-black/[0.06] bg-white">
      <div className="relative w-full overflow-x-hidden">
        <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2">
          <div className="relative h-[clamp(11rem,32vw,18rem)] w-full overflow-hidden sm:h-[clamp(12rem,28vw,17rem)]">
            {bannerSrc ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URLs from uploads
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
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent sm:h-20" />
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

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-0 sm:px-6 sm:pb-10 lg:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10 lg:gap-12">
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
                href="/mentor/profile/edit"
                className="absolute -bottom-0.5 -right-0.5 z-10 flex size-10 items-center justify-center rounded-full border-2 border-white bg-white text-primary shadow-md ring-1 ring-black/[0.08] transition hover:bg-primary/5"
                aria-label="Edit profile photo"
                title="Edit profile"
              >
                <PencilIcon className="size-[18px]" />
              </Link>
            </div>
          </div>

          <div className="min-w-0 flex-1 pt-1 sm:pt-[4.75rem]">
            {/*
              Mockup: left — name, italic title, bio; right — edit (neutral), Message pill, socials.
              Grid keeps mobile order: name → title → actions → socials → bio.
            */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-10 lg:gap-y-1">
              <h1 className="text-center font-heading text-[1.35rem] font-semibold tracking-tight text-[#0a0a0a] sm:text-2xl lg:text-left lg:text-[1.75rem] lg:col-start-1 lg:row-start-1">
                {displayName}
              </h1>
              {hasSubtitle ? (
                <p className="mx-auto mt-0 max-w-xl text-center text-[13px] italic leading-relaxed text-[#5c5c66] sm:text-sm lg:mx-0 lg:text-left lg:col-start-1 lg:row-start-2">
                  {subtitle}
                </p>
              ) : null}

              <div className="flex flex-col items-center gap-3 lg:col-start-2 lg:row-start-1 lg:items-end lg:self-start">
                <div className="flex items-center gap-2.5">
                  <Link
                    href="/mentor/profile/edit"
                    className="flex size-10 items-center justify-center rounded-full border border-black/10 bg-white text-[#6b7280] shadow-sm transition hover:bg-neutral-50"
                    aria-label="Edit profile"
                    title="Edit profile"
                  >
                    <PencilIcon className="size-[18px]" />
                  </Link>
                  <Link
                    href="/messages"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-md ring-1 ring-primary/25 transition hover:bg-primary/90"
                    aria-label="Messages"
                  >
                    <ChatBubbleIcon className="size-[18px] shrink-0 text-white" />
                    <span>Message</span>
                  </Link>
                  <ProfileSettingsMenu editProfileHref="/mentor/profile/edit" compact />
                </div>
                <div className="flex justify-center gap-3 lg:justify-end">
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
              </div>

              {user.bio?.trim() ? (
                <p
                  className={`text-left text-[13px] leading-relaxed text-[#3e3e3e] sm:text-sm lg:col-start-1 lg:max-w-2xl lg:pt-1 ${
                    hasSubtitle ? "lg:row-start-3" : "lg:row-start-2"
                  }`}
                >
                  {user.bio.trim()}
                </p>
              ) : null}
            </div>
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
