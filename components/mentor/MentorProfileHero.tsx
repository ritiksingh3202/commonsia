"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { MentorDashboardUser } from "@/components/mentor/mentor-dashboard-types";
import { LinkedInGlyph } from "@/components/profile/ProfileSocialIcons";
import { ProfileAvatarPhotoButton } from "@/components/profile/ProfileAvatarPhotoButton";
import { ProfileHeroEditMenuButton } from "@/components/profile/ProfileHeroEditMenuButton";
import { ProfileSettingsMenu } from "@/components/profile/ProfileSettingsMenu";
import { ProfileCoverStrip } from "@/components/profile/ProfileCoverStrip";
import { profileHero } from "@/components/profile/profile-hero-classes";

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
  useEffect(() => {
    setUser(initial);
  }, [initial]);

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

  const displayName = user.name?.trim() || "Mentor";
  const subtitle = mentorSubtitle(user);
  const avatarSrc = user.image?.trim() || null;
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hasSubtitle = Boolean(subtitle);

  return (
    <section className="border-b border-black/[0.06] bg-white">
      <ProfileCoverStrip
        bannerImageUrl={user.bannerImageUrl}
        onSave={async (dataUrl) => {
          await patch({ bannerImageUrl: dataUrl });
          setUser((u) => ({ ...u, bannerImageUrl: dataUrl }));
          sync();
        }}
      />

      <div className={profileHero.inner}>
        <div className={profileHero.row}>
          <div className={profileHero.avatarOuter}>
            <div className="relative">
              <div className={profileHero.avatarRing}>
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarSrc} alt="" className="size-full object-cover object-center" />
                ) : (
                  <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/12 to-primary/5 text-[clamp(1.125rem,5vw,1.5rem)] font-semibold text-primary sm:text-2xl">
                    {initials}
                  </div>
                )}
              </div>
              <ProfileAvatarPhotoButton
                currentImageSrc={avatarSrc}
                onUploaded={(url) => setUser((u) => ({ ...u, image: url }))}
                className="absolute -bottom-0.5 -right-0.5 z-10 flex size-10 items-center justify-center rounded-full border-2 border-white bg-white text-primary shadow-md ring-1 ring-black/[0.08] transition hover:bg-primary/5 disabled:opacity-60 sm:size-11"
              />
            </div>
          </div>

          <div className={profileHero.content}>
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
                <div className="flex flex-wrap items-center justify-center gap-2.5 lg:justify-end">
                  <ProfileHeroEditMenuButton
                    editProfileHref="/mentor/profile/edit"
                    triggerClassName="flex size-10 items-center justify-center rounded-full border border-black/10 bg-white text-[#6b7280] shadow-sm transition hover:bg-neutral-50"
                  />
                  <Link
                    href="/messages"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-primary text-white shadow-md ring-1 ring-primary/25 transition hover:bg-primary/90"
                    aria-label="Messages"
                  >
                    <ChatBubbleIcon className="size-[18px] shrink-0 text-white" />
                  </Link>
                  {user.linkedinUrl?.trim() ? (
                    <a
                      href={user.linkedinUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex size-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-[#0a66c2] shadow-sm transition hover:bg-neutral-50"
                      aria-label="LinkedIn profile"
                    >
                      <LinkedInGlyph profileToolbar brandColor />
                    </a>
                  ) : null}
                  <Link
                    href="/mentor/availability"
                    className="inline-flex h-10 shrink-0 items-center rounded-full border border-black/10 bg-white px-3 text-[12px] font-semibold text-[#0a0a0a] shadow-sm transition hover:bg-neutral-50 sm:px-3.5 sm:text-[13px]"
                  >
                    Update availability
                  </Link>
                  <ProfileSettingsMenu editProfileHref="/mentor/profile/edit" compact />
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
