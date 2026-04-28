"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useState, type ReactNode } from "react";

export type MentorChatPageProps = {
  mentorName: string;
  mentorRole: string;
  mentorInitials: string;
  mentorCredentials: string;
  backHref: string;
  /** When set (from saved mentor availability), replaces mock slots. */
  availabilitySummary?: string | null;
  /** Deep-link booking to this mentor. */
  mentorUserId?: string | null;
  /** From mentor availability JSON when `mentorUserId` is set. */
  sessionDurationMinutes?: number | null;
};

type ChatMessage = {
  id: number;
  text: string;
  time: string;
  isMentor: boolean;
  dateGroup: "yesterday" | "today";
};

const SEED_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    text: "I was thinking of using vertical louvers but I'm not sure about spacing and orientation.",
    time: "9:23 AM",
    isMentor: true,
    dateGroup: "yesterday",
  },
  {
    id: 2,
    text: "Got it, it's my first. Also, can we schedule a session to review my design?",
    time: "9:28 PM",
    isMentor: false,
    dateGroup: "yesterday",
  },
  {
    id: 3,
    text: "Sure, you can book a slot from my availability. We can go through your design in detail.",
    time: "9:30 PM",
    isMentor: true,
    dateGroup: "yesterday",
  },
  {
    id: 4,
    text: "Hi, I'm currently working on my studio project, and I'm stuck on the façade design.",
    time: "11:23 AM",
    isMentor: false,
    dateGroup: "today",
  },
  {
    id: 5,
    text: "I'm not sure how to approach shading and light control. Could you guide me on this?",
    time: "11:23 AM",
    isMentor: false,
    dateGroup: "today",
  },
  {
    id: 6,
    text: "Hi! That's a very common challenge. First, try understanding the sun path for your site.",
    time: "11:31 AM",
    isMentor: true,
    dateGroup: "today",
  },
];

const STUDENT_INITIALS = "JD";

function formatNowTime(): string {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function MentorChatPage({
  mentorName,
  mentorRole,
  mentorInitials,
  mentorCredentials,
  backHref,
  availabilitySummary = null,
  mentorUserId = null,
  sessionDurationMinutes = null,
}: MentorChatPageProps) {
  const { data: session } = useSession();
  const scheduleTarget = mentorUserId?.trim()
    ? `/schedule?mentorUserId=${encodeURIComponent(mentorUserId.trim())}`
    : "/schedule";
  const scheduleHref = session?.user?.id
    ? scheduleTarget
    : `/auth/login?callbackUrl=${encodeURIComponent(scheduleTarget)}`;

  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [message, setMessage] = useState("");
  const [showProfile, setShowProfile] = useState(true);
  const [nextId, setNextId] = useState(100);

  const send = useCallback(() => {
    const t = message.trim();
    if (!t) return;
    setMessages((prev) => [
      ...prev,
      {
        id: nextId,
        text: t,
        time: formatNowTime(),
        isMentor: false,
        dateGroup: "today",
      },
    ]);
    setNextId((n) => n + 1);
    setMessage("");
  }, [message, nextId]);

  return (
    <div className="flex h-[100dvh] flex-col bg-neutral-50">
      <header className="z-10 shrink-0 border-b border-neutral-200 bg-white px-4 py-3">
        <div className="mx-auto grid max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Link
            href={backHref}
            className="flex items-center gap-2 justify-self-start text-sm font-medium text-neutral-600 transition hover:text-[#0a0a0a]"
          >
            <IconArrowLeft className="size-5 shrink-0" />
            <span>Back</span>
          </Link>
          <div className="flex min-w-0 max-w-[min(100vw-8rem,20rem)] items-center justify-center gap-2 sm:max-w-none sm:gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 sm:size-10">
              <span className="text-xs font-semibold text-primary sm:text-sm">{mentorInitials}</span>
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-center text-sm font-semibold text-[#0a0a0a]">{mentorName}</h3>
              <p className="truncate text-center text-xs text-neutral-500">{mentorRole}</p>
            </div>
          </div>
          <div className="flex justify-self-end">
            <button
              type="button"
              className="rounded-full p-2 text-neutral-600 transition hover:bg-neutral-100"
              aria-label="Start call"
            >
              <IconPhone className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="relative mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col lg:flex-row lg:overflow-hidden">
        {/* Chat */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            {messages.map((msg, idx) => {
              const showDate =
                idx === 0 || messages[idx - 1].dateGroup !== msg.dateGroup;
              return (
                <div key={msg.id}>
                  {showDate ? (
                    <div className="mb-5 flex justify-center">
                      <span className="rounded-full bg-neutral-100 px-4 py-1 text-xs font-medium text-neutral-600">
                        {msg.dateGroup === "yesterday" ? "Yesterday" : "Today"}
                      </span>
                    </div>
                  ) : null}
                  <div className={`flex gap-2 sm:gap-3 ${msg.isMentor ? "justify-start" : "justify-end"}`}>
                    {msg.isMentor ? (
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 sm:size-10">
                        <span className="text-xs font-semibold text-primary sm:text-sm">{mentorInitials}</span>
                      </div>
                    ) : null}
                    <div
                      className={`flex max-w-[85%] flex-col sm:max-w-[60%] ${msg.isMentor ? "items-start" : "items-end"}`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-2.5 sm:py-3 ${
                          msg.isMentor ? "bg-neutral-100 text-[#0a0a0a]" : "bg-primary text-white"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      </div>
                      <span className="mt-1 px-1 text-xs text-neutral-400">{msg.time}</span>
                    </div>
                    {!msg.isMentor ? (
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-100 sm:size-10">
                        <span className="text-xs font-semibold text-sky-600 sm:text-sm">{STUDENT_INITIALS}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="shrink-0 border-t border-neutral-200 bg-white p-3 sm:p-4">
            <div className="mx-auto flex max-w-4xl items-center gap-1.5 sm:gap-2">
              <IconButton label="Add">
                <IconPlus className="size-5 text-neutral-600" />
              </IconButton>
              <IconButton label="Emoji">
                <IconSmile className="size-5 text-neutral-600" />
              </IconButton>
              <IconButton label="Attach">
                <IconPaperclip className="size-5 text-neutral-600" />
              </IconButton>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Type Your Message..."
                className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              <IconButton label="Voice">
                <IconMic className="size-5 text-neutral-600" />
              </IconButton>
              <button
                type="button"
                onClick={send}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md transition hover:bg-primary/90"
                aria-label="Send"
              >
                <IconSend className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar overlay — mobile */}
        {showProfile ? (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-hidden
            onClick={() => setShowProfile(false)}
          />
        ) : null}

        {showProfile ? (
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-neutral-200 bg-white shadow-2xl lg:static lg:z-0 lg:w-[400px] lg:max-w-none lg:shadow-none">
            <div className="shrink-0 border-b border-neutral-200 p-5 sm:p-6">
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-lg font-semibold text-[#0a0a0a]">Profile</h3>
                <button
                  type="button"
                  onClick={() => setShowProfile(false)}
                  className="rounded-full p-1.5 text-neutral-600 hover:bg-neutral-100"
                  aria-label="Close profile"
                >
                  <IconX className="size-5" />
                </button>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex size-24 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-2xl font-semibold text-primary">{mentorInitials}</span>
                </div>
                <h4 className="text-xl font-bold text-[#0a0a0a]">{mentorName}</h4>
                <p className="mt-1 text-sm text-neutral-600">{mentorCredentials}</p>
                <div className="mt-4 flex gap-3">
                  <a
                    href="#"
                    className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary transition hover:bg-primary/20"
                    aria-label="Website"
                  >
                    <IconGlobe className="size-4" />
                  </a>
                  <a
                    href="#"
                    className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary transition hover:bg-primary/20"
                    aria-label="LinkedIn"
                  >
                    <IconLinkedIn className="size-4" />
                  </a>
                  <a
                    href="mailto:"
                    className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary transition hover:bg-primary/20"
                    aria-label="Email"
                  >
                    <IconMail className="size-4" />
                  </a>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
              <div className="rounded-xl border border-black/[0.06] bg-neutral-50/80 p-3">
                <h4 className="mb-1.5 font-semibold text-[#0a0a0a]">Sessions</h4>
                <p className="text-sm leading-relaxed text-neutral-700">
                  Bookings are one-to-one. Session length follows this mentor’s availability settings
                  {typeof sessionDurationMinutes === "number" ? (
                    <>
                      : <span className="font-semibold text-primary">{sessionDurationMinutes} minutes</span> per
                      session.
                    </>
                  ) : (
                    <> (open a mentor from their profile to see their exact length).</>
                  )}
                </p>
              </div>
              <div>
                <h4 className="mb-3 font-semibold text-[#0a0a0a]">Availability</h4>
                {availabilitySummary ? (
                  <p className="text-sm leading-relaxed text-neutral-700">{availabilitySummary}</p>
                ) : (
                  <p className="text-sm leading-relaxed text-neutral-600">
                    Open this chat from a mentor’s profile to see their next open time. Use{" "}
                    <span className="font-medium text-[#0a0a0a]">Schedule a Call</span> below to pick a real slot from
                    their calendar.
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-neutral-200 p-5 sm:p-6">
              <Link
                href={scheduleHref}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90"
              >
                <IconCalendar className="size-4" />
                Schedule a Call
              </Link>
            </div>
          </aside>
        ) : null}

        {!showProfile ? (
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            className="fixed bottom-6 right-4 z-30 flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:bg-primary/90 lg:bottom-auto lg:right-4 lg:top-1/2 lg:-translate-y-1/2"
            aria-label="Show mentor profile"
          >
            <IconUser className="size-5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function IconButton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      className="shrink-0 rounded-full p-1.5 transition hover:bg-neutral-100 sm:p-2"
      aria-label={label}
    >
      {children}
    </button>
  );
}

function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19 12H5M11 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPhone({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5.5 4h3l1.5 4-2 1.5a12 12 0 006 6l1.5-2 4 1.5v3a2 2 0 01-2.2 2A19 19 0 013.5 6.2 2 2 0 014 4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconSmile({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconPaperclip({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMic({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3zM19 10v1a7 7 0 01-14 0v-1M12 18v4M8 22h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSend({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

function IconLinkedIn({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.5 8.5h2.5v11H6.5v-11zm1.25-4a1.5 1.5 0 11-.001 3.001A1.5 1.5 0 019.75 4.5zM13 8.5h2.4v1.5h.03c.33-.63 1.15-1.3 2.37-1.3 2.53 0 3 1.67 3 3.83V19.5h-2.6v-5.6c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.7H13V8.5z" />
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

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
