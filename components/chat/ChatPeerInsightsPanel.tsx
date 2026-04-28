"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

import { LinkedInGlyph } from "@/components/profile/ProfileSocialIcons";

export type InsightsPeer = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  subtitle: string;
  role: "student" | "mentor" | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  whatsappUrl: string | null;
  portfolioUrl: string | null;
  /** When the peer is a mentor, from saved availability (same as booking page). */
  mentorSessionDurationMinutes?: number | null;
};

function initials(name: string | null | undefined, email: string | null | undefined): string {
  const n = name?.trim();
  if (n) {
    return n
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  const e = email?.trim();
  return e ? e.slice(0, 2).toUpperCase() : "?";
}

type SlotPreview = { dateLabel: string; rangeLabel: string };

export function ChatPeerInsightsPanel({
  viewerRole,
  peer,
  onClose,
  showClose,
  className = "",
}: {
  viewerRole: "student" | "mentor";
  peer: InsightsPeer;
  /** Mobile drawer — show X to dismiss */
  onClose: () => void;
  showClose: boolean;
  className?: string;
}) {
  const { data: session } = useSession();
  const isMentorPeer = peer.role === "mentor";
  const showMentorBooking = viewerRole === "student" && isMentorPeer;
  const showStudentProfile = viewerRole === "mentor" && peer.role === "student";

  const scheduleTarget = showMentorBooking
    ? `/schedule?mentorUserId=${encodeURIComponent(peer.id)}`
    : "/schedule";
  const scheduleHref = session?.user?.id
    ? scheduleTarget
    : `/auth/login?callbackUrl=${encodeURIComponent(scheduleTarget)}`;

  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotPreviews, setSlotPreviews] = useState<SlotPreview[]>([]);

  const loadSlots = useCallback(async () => {
    if (!showMentorBooking) return;
    setSlotsLoading(true);
    const out: SlotPreview[] = [];
    try {
      const start = new Date();
      for (let add = 0; add < 21 && out.length < 8; add++) {
        const day = new Date(start);
        day.setDate(start.getDate() + add);
        const year = day.getFullYear();
        const month = day.getMonth();
        const d = day.getDate();
        const res = await fetch(
          `/api/schedule/mentor-slots?mentorUserId=${encodeURIComponent(peer.id)}&year=${year}&month=${month}&day=${d}`,
        );
        if (!res.ok) continue;
        const data = (await res.json()) as { slots?: { rangeLabelIst?: string }[] };
        const slots = data.slots ?? [];
        const dateLabel = day.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        for (const s of slots) {
          const label = s.rangeLabelIst?.trim();
          if (!label) continue;
          out.push({ dateLabel, rangeLabel: label });
          if (out.length >= 8) break;
        }
      }
      setSlotPreviews(out);
    } finally {
      setSlotsLoading(false);
    }
  }, [peer.id, showMentorBooking]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const displayName = peer.name?.trim() || peer.email?.split("@")[0] || "User";
  const ini = initials(peer.name, peer.email);

  return (
    <aside
      className={`flex min-h-0 w-full max-w-md shrink-0 flex-col border-l border-neutral-200 bg-white xl:max-w-[380px] ${className}`}
    >
      <div className="shrink-0 border-b border-neutral-200 p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-[#0a0a0a]">Profile</h3>
          {showClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-neutral-600 hover:bg-neutral-100 xl:hidden"
              aria-label="Close panel"
            >
              <IconX className="size-5" />
            </button>
          ) : null}
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex size-20 items-center justify-center overflow-hidden rounded-full bg-primary/10 sm:size-24">
            {peer.image?.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={peer.image.trim()} alt="" className="size-full object-cover" />
            ) : (
              <span className="text-xl font-semibold text-primary sm:text-2xl">{ini}</span>
            )}
          </div>
          <h4 className="text-lg font-bold text-[#0a0a0a]">{displayName}</h4>
          {peer.subtitle ? <p className="mt-1 text-sm text-neutral-600">{peer.subtitle}</p> : null}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {peer.portfolioUrl?.trim() ? (
              <a
                href={peer.portfolioUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary transition hover:bg-primary/20"
                aria-label="Portfolio or website"
              >
                <IconGlobe className="size-4" />
              </a>
            ) : null}
            {peer.linkedinUrl?.trim() ? (
              <a
                href={peer.linkedinUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary transition hover:bg-primary/20"
                aria-label="LinkedIn"
              >
                <LinkedInGlyph profileToolbar brandColor className="!size-4 !max-h-4 !max-w-4" />
              </a>
            ) : null}
            {peer.email?.trim() ? (
              <a
                href={`mailto:${peer.email.trim()}`}
                className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary transition hover:bg-primary/20"
                aria-label="Email"
              >
                <IconMail className="size-4" />
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
        {showStudentProfile ? (
          <div className="rounded-xl border border-black/[0.06] bg-neutral-50/80 p-3 text-left">
            <p className="text-sm text-neutral-700">
              View their full portfolio and details on the student profile page.
            </p>
            <Link
              href={`/mentor/students/${encodeURIComponent(peer.id)}`}
              className="mt-2 inline-flex text-sm font-semibold text-primary hover:underline"
            >
              Open student profile →
            </Link>
          </div>
        ) : null}

        {showMentorBooking ? (
          <>
            <div className="rounded-xl border border-black/[0.06] bg-neutral-50/80 p-3">
              <h4 className="mb-1.5 font-semibold text-[#0a0a0a]">Booking</h4>
              <p className="text-sm leading-relaxed text-neutral-700">
                One-to-one sessions only. Session length is set by the mentor in their availability
                {typeof peer.mentorSessionDurationMinutes === "number" ? (
                  <>
                    : <span className="font-semibold text-primary">{peer.mentorSessionDurationMinutes} minutes</span>{" "}
                    per booking.
                  </>
                ) : (
                  <> (shown on the schedule page when you pick a time).</>
                )}
              </p>
            </div>
            <div>
              <h4 className="mb-2 font-semibold text-[#0a0a0a]">Open windows (next few days)</h4>
              {slotsLoading ? (
                <p className="text-sm text-neutral-500">Loading availability…</p>
              ) : slotPreviews.length === 0 ? (
                <p className="text-sm text-neutral-600">
                  No open times in the next few weeks. Ask your mentor to update availability or check back later.
                </p>
              ) : (
                <ul className="space-y-2">
                  {slotPreviews.map((s, i) => (
                    <li
                      key={`${s.dateLabel}-${s.rangeLabel}-${i}`}
                      className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-[#0a0a0a]"
                    >
                      <span className="font-medium text-neutral-800">{s.dateLabel}</span>
                      <span className="mx-1.5 text-neutral-400">·</span>
                      <span className="text-primary">{s.rangeLabel}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}

        {!showMentorBooking && !showStudentProfile && isMentorPeer ? (
          <p className="text-sm text-neutral-600">Conversation details</p>
        ) : null}
      </div>

      {showMentorBooking ? (
        <div className="shrink-0 border-t border-neutral-200 p-4 sm:p-5">
          <Link
            href={scheduleHref}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90"
          >
            <IconCalendar className="size-4" />
            Schedule a call
          </Link>
        </div>
      ) : null}
    </aside>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16v12H4V6zm0 0l8 6 8-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 7V5m8 2V5m-9 4h10M6 21h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
