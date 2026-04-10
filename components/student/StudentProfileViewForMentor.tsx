"use client";

import Link from "next/link";

import {
  InstagramGlyph,
  LinkedInGlyph,
  SocialIconButton,
  WhatsAppGlyph,
} from "@/components/profile/ProfileSocialIcons";

import { ProfileCover } from "@/components/ProfileCover";
import { PortfolioViewerPanel } from "@/components/profile/PortfolioViewerPanel";
import { profileCoverDisplaySrc } from "@/lib/profile-cover";
import {
  formatStudentSubtitle,
  parseInterests,
  parseSoftwarePills,
  type StudentProfileUser,
} from "./student-profile-types";

const pill =
  "inline-flex items-center rounded-full bg-primary/95 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm ring-1 ring-primary/20 sm:text-xs";

export function StudentProfileViewForMentor({
  user,
  messageHref,
  backHref,
}: {
  user: StudentProfileUser;
  messageHref: string;
  backHref: string;
}) {
  const interests = parseInterests(user.interests);
  const software = parseSoftwarePills(user.softwareSkills);
  const subtitle = formatStudentSubtitle(user);
  const displayName = user.name?.trim() || user.email?.split("@")[0] || "Student";
  const avatarSrc = user.image?.trim() || null;
  const bannerSrc = profileCoverDisplaySrc(user.bannerImageUrl);

  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-full">
      <section className="border-b border-black/[0.06] bg-white">
        <ProfileCover imageSrc={bannerSrc} alt="" priority />

        <div className="relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-0 sm:px-6 sm:pb-10 lg:px-10">
          <div className="mb-4 sm:mb-0">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-[#0a0a0a]"
            >
              <span aria-hidden>←</span>
              Back to dashboard
            </Link>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10 lg:gap-12">
            <div className="-mt-10 flex shrink-0 justify-center sm:-mt-[4.25rem] lg:-mt-[5rem] sm:justify-start">
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
                <div className="flex shrink-0 items-center justify-center sm:justify-end sm:pt-1">
                  <Link
                    href={messageHref}
                    className="flex size-11 items-center justify-center rounded-full bg-primary text-white shadow-md ring-1 ring-primary/20 transition hover:bg-primary/90 sm:size-12"
                    aria-label="Message student"
                  >
                    <ChatBubbleIcon className="size-[18px]" />
                  </Link>
                </div>
              </div>

              <div className="mt-3 flex justify-center gap-3 sm:justify-end">
                <SocialIconButton href={user.whatsappUrl} label="WhatsApp" icon={<WhatsAppGlyph />} />
                <SocialIconButton
                  href={user.linkedinUrl}
                  label="LinkedIn"
                  icon={<LinkedInGlyph profileToolbar brandColor />}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-white shadow-sm transition hover:bg-primary/5 sm:size-12"
                />
                <SocialIconButton href={user.instagramUrl} label="Instagram" icon={<InstagramGlyph />} />
              </div>

              {user.bio?.trim() ? (
                <p className="mx-auto mt-5 max-w-2xl text-left text-[13px] leading-relaxed text-[#3e3e3e] sm:mx-0 sm:text-sm">
                  {user.bio.trim()}
                </p>
              ) : null}

              <PortfolioViewerPanel
                userId={user.id}
                portfolioUrl={user.portfolioUrl}
                portfolioFileName={user.portfolioFileName}
                portfolioVisibleToOthers={user.portfolioVisibleToOthers ?? true}
              />

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
    </div>
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
