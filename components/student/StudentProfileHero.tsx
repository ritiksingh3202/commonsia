"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { compressImageToDataUrl } from "@/lib/resize-image-client";

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
  const [busy, setBusy] = useState<null | "banner" | "avatar">(null);
  const [linksOpen, setLinksOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState({
    whatsapp: user.whatsappUrl ?? "",
    linkedin: user.linkedinUrl ?? "",
    instagram: user.instagramUrl ?? "",
  });

  useEffect(() => {
    setUser(initial);
    setLinkDraft({
      whatsapp: initial.whatsappUrl ?? "",
      linkedin: initial.linkedinUrl ?? "",
      instagram: initial.instagramUrl ?? "",
    });
  }, [initial]);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file?.type.startsWith("image/")) return;
    setBusy("avatar");
    try {
      const dataUrl = await compressImageToDataUrl(file, { maxEdge: 512, quality: 0.88 });
      await patch({ image: dataUrl });
      setUser((u) => ({ ...u, image: dataUrl }));
      sync();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not update photo.");
    } finally {
      setBusy(null);
    }
  };

  const saveLinks = async () => {
    try {
      await patch({
        whatsappUrl: linkDraft.whatsapp.trim() || null,
        linkedinUrl: linkDraft.linkedin.trim() || null,
        instagramUrl: linkDraft.instagram.trim() || null,
      });
      setUser((u) => ({
        ...u,
        whatsappUrl: linkDraft.whatsapp.trim() || null,
        linkedinUrl: linkDraft.linkedin.trim() || null,
        instagramUrl: linkDraft.instagram.trim() || null,
      }));
      setLinksOpen(false);
      sync();
    } catch {
      window.alert("Could not save links.");
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
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-0.5 -right-0.5 z-10 flex size-10 items-center justify-center rounded-full border-2 border-white bg-white text-[#0a0a0a] shadow-md ring-1 ring-black/[0.08] transition hover:bg-neutral-50 disabled:opacity-60"
                aria-label="Edit profile photo"
                title="Edit profile photo"
              >
                {busy === "avatar" ? (
                  <span className="size-3.5 animate-pulse rounded-full bg-primary/60" />
                ) : (
                  <PencilIcon className="size-[18px]" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onAvatarFile}
              />
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
              <div className="flex shrink-0 items-center justify-center gap-2 sm:justify-end sm:pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setLinkDraft({
                      whatsapp: user.whatsappUrl ?? "",
                      linkedin: user.linkedinUrl ?? "",
                      instagram: user.instagramUrl ?? "",
                    });
                    setLinksOpen((o) => !o);
                  }}
                  className="flex size-10 items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#0a0a0a] shadow-sm transition hover:bg-neutral-50"
                  aria-label="Edit social links"
                  title="Edit social links"
                >
                  <LinkChainIcon className="size-[18px] text-[#4a5565]" />
                </button>
                <button
                  type="button"
                  className="flex size-10 items-center justify-center rounded-full bg-primary text-white shadow-md ring-1 ring-primary/20 transition hover:bg-primary/90"
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
                color="bg-[#25D366]"
                icon={<WhatsAppGlyph className="size-[18px] text-white" />}
              />
              <SocialIconButton
                href={user.linkedinUrl}
                label="LinkedIn"
                color="bg-[#0A66C2]"
                icon={<LinkedInGlyph className="size-[18px] text-white" />}
              />
              <SocialIconButton
                href={user.instagramUrl}
                label="Instagram"
                color="bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]"
                icon={<InstagramGlyph className="size-[18px] text-white" />}
              />
            </div>

            {linksOpen && (
              <div className="mt-4 space-y-2 rounded-xl border border-black/10 bg-neutral-50/90 p-3 text-left sm:ml-auto sm:max-w-md">
                <p className="text-[12px] font-medium text-[#0a0a0a]">Social profile links</p>
                <label className="block text-[11px] text-[#717182]">
                  WhatsApp (full URL)
                  <input
                    value={linkDraft.whatsapp}
                    onChange={(e) => setLinkDraft((d) => ({ ...d, whatsapp: e.target.value }))}
                    className="mt-0.5 w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-[13px] text-[#0a0a0a]"
                    placeholder="https://wa.me/..."
                  />
                </label>
                <label className="block text-[11px] text-[#717182]">
                  LinkedIn
                  <input
                    value={linkDraft.linkedin}
                    onChange={(e) => setLinkDraft((d) => ({ ...d, linkedin: e.target.value }))}
                    className="mt-0.5 w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-[13px] text-[#0a0a0a]"
                    placeholder="https://linkedin.com/in/..."
                  />
                </label>
                <label className="block text-[11px] text-[#717182]">
                  Instagram
                  <input
                    value={linkDraft.instagram}
                    onChange={(e) => setLinkDraft((d) => ({ ...d, instagram: e.target.value }))}
                    className="mt-0.5 w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-[13px] text-[#0a0a0a]"
                    placeholder="https://instagram.com/..."
                  />
                </label>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setLinksOpen(false)}
                    className="rounded-md px-3 py-1.5 text-[13px] text-[#4a5565] hover:bg-black/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveLinks()}
                    className="rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-white hover:bg-primary/90"
                  >
                    Save links
                  </button>
                </div>
              </div>
            )}

            {user.bio?.trim() && (
              <p className="mx-auto mt-5 max-w-2xl text-left text-[13px] leading-relaxed text-[#3e3e3e] sm:mx-0 sm:text-sm">
                {user.bio.trim()}
              </p>
            )}

            {interests.length > 0 && (
              <div className="mt-6 text-left">
                <h2 className="text-sm font-semibold text-[#0a0a0a] sm:text-base">Interests and Skills</h2>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {interests.map((tag) => (
                    <span key={tag} className={pill}>
                      {tag}
                    </span>
                  ))}
                </div>
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

function SocialIconButton({
  href,
  label,
  color,
  icon,
}: {
  href: string | null;
  label: string;
  color: string;
  icon: ReactNode;
}) {
  if (!href?.trim()) {
    return (
      <span
        className={`flex size-9 cursor-not-allowed items-center justify-center rounded-full opacity-35 ${color}`}
        title={`Add ${label} in profile links`}
        aria-hidden
      >
        {icon}
      </span>
    );
  }
  return (
    <a
      href={href.trim()}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex size-9 items-center justify-center rounded-full shadow-sm transition hover:opacity-90 ${color}`}
      aria-label={label}
    >
      {icon}
    </a>
  );
}

function LinkChainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
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

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}
