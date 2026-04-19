"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ProfileAvatarPhotoButton } from "@/components/profile/ProfileAvatarPhotoButton";
import { ProfileHeroEditMenuButton } from "@/components/profile/ProfileHeroEditMenuButton";
import { ProfileCoverStrip } from "@/components/profile/ProfileCoverStrip";
import { LinkedInGlyph, SocialIconButton } from "@/components/profile/ProfileSocialIcons";
import { ProfileSettingsMenu } from "@/components/profile/ProfileSettingsMenu";
import { profileHero, profileSkillsSectionTitle } from "@/components/profile/profile-hero-classes";

import {
  formatStudentSubtitle,
  parseInterests,
  parseSoftwarePills,
  type StudentProfileUser,
} from "./student-profile-types";

/** Same slate chips as mentor cards (`globals.css` — `.mentor-tag-expertise-pill`). */
const interestSoftwareTagClass = "mentor-tag-expertise-pill";

type Props = {
  user: StudentProfileUser;
};

export function StudentProfileHero({ user: initial }: Props) {
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

  const interests = parseInterests(user.interests);
  const software = parseSoftwarePills(user.softwareSkills);
  const subtitle = formatStudentSubtitle(user);
  const displayName = user.name?.trim() || user.email?.split("@")[0] || "Student";
  const avatarSrc = user.image?.trim() || null;
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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

      {/* Identity + bio — readable column width */}
      <div className={profileHero.inner}>
        <div className={profileHero.row}>
          {/* Avatar + change photo (inline — full profile edit stays in toolbar) */}
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0 text-center sm:text-left">
                <h1 className="font-heading text-[1.35rem] font-semibold tracking-tight text-[#0a0a0a] sm:text-2xl lg:text-[1.75rem]">
                  {displayName}
                </h1>
                <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-[#5c5c66] sm:text-sm">
                  {subtitle}
                </p>
                {user.bio?.trim() ? (
                  <p className="mx-auto mt-3 max-w-2xl text-[13px] leading-relaxed text-[#3e3e3e] sm:mx-0 sm:text-sm">
                    {user.bio.trim()}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-center gap-2.5 sm:justify-end sm:pt-1">
                <ProfileHeroEditMenuButton
                  editProfileHref="/student/profile/edit"
                  triggerClassName="flex size-10 items-center justify-center rounded-full border border-black/10 bg-white text-[#6b7280] shadow-sm transition hover:bg-neutral-50"
                />
                <Link
                  href="/messages"
                  className="flex size-11 items-center justify-center rounded-full bg-primary text-white shadow-md ring-1 ring-primary/20 transition hover:bg-primary/90 sm:size-10"
                  aria-label="Messages"
                >
                  <ChatBubbleIcon className="size-[18px]" />
                </Link>
                <SocialIconButton
                  href={user.linkedinUrl}
                  label="LinkedIn"
                  icon={<LinkedInGlyph profileToolbar brandColor />}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-white shadow-sm transition hover:bg-primary/5 sm:size-10"
                />
                <ProfileSettingsMenu editProfileHref="/student/profile/edit" />
              </div>
            </div>

            {(interests.length > 0 || user.otherInterests?.trim()) && (
              <div className="mt-6 text-left">
                <h2 className={profileSkillsSectionTitle}>Interests and Skills</h2>
                {interests.length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {interests.map((tag) => (
                      <span key={tag} className={interestSoftwareTagClass}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                {user.otherInterests?.trim() ? (
                  <p className="mt-3 text-[13px] leading-relaxed text-neutral-600 sm:text-sm">
                    <span className="font-medium text-neutral-600">Other interests: </span>
                    {user.otherInterests.trim()}
                  </p>
                ) : null}
              </div>
            )}

            {software.length > 0 && (
              <div className="mt-5 text-left">
                <h2 className={profileSkillsSectionTitle}>Software Skills</h2>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {software.map((tag) => (
                    <span key={tag} className={interestSoftwareTagClass}>
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
