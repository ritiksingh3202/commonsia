"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChatPeerInsightsPanel } from "@/components/chat/ChatPeerInsightsPanel";
import { CHAT_DECLINED, CHAT_PENDING } from "@/lib/chat-thread-status";

/**
 * Near–real-time updates without a dedicated WebSocket service: short polling while the
 * tab is visible. When you add a WS gateway (e.g. PartyKit, Pusher, or a custom `ws`
 * server), replace these intervals with subscribe/push and keep POST send + one refetch.
 */
const MESSAGE_POLL_MS = 1000;
const THREAD_LIST_POLL_MS = 3500;

type Peer = {
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
};

export type ThreadListItem = {
  id: string;
  status: string;
  updatedAt: string;
  peer: Peer;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
};

type ChatMessageRow = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  isMine: boolean;
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

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function MessagesInbox({
  initialPeerId,
  initialThreadId,
  backHref,
}: {
  initialPeerId: string | null;
  /** Deep-link from notifications: `/messages?thread=…` */
  initialThreadId?: string | null;
  backHref: string;
}) {
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [role, setRole] = useState<"student" | "mentor" | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [threadStatus, setThreadStatus] = useState<string | null>(null);
  const [msgError, setMsgError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [openingPeer, setOpeningPeer] = useState(false);
  const [bootstrapThread, setBootstrapThread] = useState<ThreadListItem | null>(null);
  const [mobileChat, setMobileChat] = useState(false);
  const [contextPanelMobileOpen, setContextPanelMobileOpen] = useState(false);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const msgsEndRef = useRef<HTMLDivElement>(null);
  /** Ignore stale HTTP responses when multiple list/message fetches overlap. */
  const threadsFetchGen = useRef(0);
  const messagesFetchGen = useRef(0);

  const selected = useMemo(() => {
    const fromList = threads.find((t) => t.id === selectedId) ?? null;
    if (fromList) return fromList;
    if (bootstrapThread && bootstrapThread.id === selectedId) return bootstrapThread;
    return null;
  }, [threads, selectedId, bootstrapThread]);

  useEffect(() => {
    if (!bootstrapThread || !threads.some((t) => t.id === bootstrapThread.id)) return;
    setBootstrapThread(null);
  }, [threads, bootstrapThread]);

  const isMentor = role === "mentor";
  const mentorCannotSend = selected && selected.status === CHAT_PENDING && isMentor;
  const studentPendingNote =
    selected && selected.status === CHAT_PENDING && !isMentor && messages.length > 0;
  const showMentorRequestModal =
    Boolean(isMentor && threadStatus === CHAT_PENDING && selectedId && selected);

  const loadThreads = useCallback(async () => {
    const gen = ++threadsFetchGen.current;
    setListError(null);
    try {
      const res = await fetch("/api/chat/threads", { cache: "no-store" });
      if (gen !== threadsFetchGen.current) return;
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setListError(j.error || "Could not load conversations");
        setLoadingList(false);
        return;
      }
      const data = (await res.json()) as {
        threads: ThreadListItem[];
        role: "student" | "mentor";
      };
      if (gen !== threadsFetchGen.current) return;
      setThreads(data.threads);
      setRole(data.role);
      setLoadingList(false);
      return data;
    } catch {
      if (gen !== threadsFetchGen.current) return;
      setListError("Could not load conversations");
      setLoadingList(false);
    }
  }, []);

  const openOrCreatePeer = useCallback(
    async (peerUserId: string) => {
      setOpeningPeer(true);
      setListError(null);
      try {
        const res = await fetch("/api/chat/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ peerUserId }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setListError(j.error || "Could not open chat");
          return;
        }
        const data = (await res.json()) as { thread: ThreadListItem };
        setBootstrapThread(data.thread);
        setSelectedId(data.thread.id);
        setMobileChat(true);
        setContextPanelMobileOpen(false);
        await loadThreads();
      } finally {
        setOpeningPeer(false);
      }
    },
    [loadThreads],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadThreads();
    }, 0);
    return () => window.clearTimeout(t);
  }, [loadThreads]);

  useEffect(() => {
    if (!initialPeerId) return;
    const t = window.setTimeout(() => {
      void openOrCreatePeer(initialPeerId);
    }, 0);
    return () => window.clearTimeout(t);
  }, [initialPeerId, openOrCreatePeer]);

  const loadMessages = useCallback(async (threadId: string) => {
    const gen = ++messagesFetchGen.current;
    setLoadingMsgs(true);
    setMsgError(null);
    try {
      const res = await fetch(`/api/chat/threads/${threadId}/messages`, { cache: "no-store" });
      if (gen !== messagesFetchGen.current) return;
      if (!res.ok) {
        setMsgError("Could not load messages");
        return;
      }
      const data = (await res.json()) as { status: string; messages: ChatMessageRow[] };
      if (gen !== messagesFetchGen.current) return;
      setThreadStatus(data.status);
      setMessages(data.messages);
    } catch {
      if (gen !== messagesFetchGen.current) return;
      setMsgError("Could not load messages");
    } finally {
      if (gen === messagesFetchGen.current) {
        setLoadingMsgs(false);
      }
    }
  }, []);

  useEffect(() => {
    const tid = initialThreadId?.trim();
    if (!tid) return;
    if (loadingList) return;
    const exists = threads.some((t) => t.id === tid);
    if (!exists) return;
    setSelectedId(tid);
    setMobileChat(true);
  }, [initialThreadId, threads, loadingList]);

  useEffect(() => {
    if (!selectedId) {
      const clearT = window.setTimeout(() => {
        setMessages([]);
        setThreadStatus(null);
      }, 0);
      return () => window.clearTimeout(clearT);
    }
    setMessages([]);
    setThreadStatus(null);
    setMsgError(null);
    const kick = window.setTimeout(() => {
      void loadMessages(selectedId);
    }, 0);
    const poll = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      void loadMessages(selectedId);
    }, MESSAGE_POLL_MS);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(poll);
    };
  }, [selectedId, loadMessages]);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      void loadThreads();
    }, THREAD_LIST_POLL_MS);
    return () => window.clearInterval(id);
  }, [loadThreads]);

  useEffect(() => {
    const onFocus = () => {
      void loadThreads();
      if (selectedId) void loadMessages(selectedId);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadThreads, loadMessages, selectedId]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      void loadThreads();
      if (selectedId) void loadMessages(selectedId);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [loadThreads, loadMessages, selectedId]);

  const send = async () => {
    const t = draft.trim();
    if (!t || !selectedId || sending) return;
    if (mentorCannotSend) return;
    setSending(true);
    setMsgError(null);
    const res = await fetch(`/api/chat/threads/${selectedId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: t }),
    });
    setSending(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setMsgError(j.error || "Send failed");
      return;
    }
    setDraft("");
    await loadMessages(selectedId);
    await loadThreads();
  };

  const onAcceptDecline = async (action: "accept" | "decline") => {
    if (!selectedId) return;
    const res = await fetch(`/api/chat/threads/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) return;
    await loadMessages(selectedId);
    await loadThreads();
  };

  const selectThread = (id: string) => {
    setSelectedId(id);
    setMobileChat(true);
    setContextPanelMobileOpen(false);
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-neutral-50">
      <header className="z-10 shrink-0 border-b border-neutral-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3">
          <Link
            href={backHref}
            className="flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-[#0a0a0a]"
          >
            <span aria-hidden>←</span>
            <span>Back</span>
          </Link>
          <h1 className="text-sm font-semibold text-[#0a0a0a] sm:text-base">Messages</h1>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col md:flex-row md:overflow-hidden">
        {/* Thread list */}
        <aside
          className={`flex min-h-0 w-full shrink-0 flex-col border-neutral-200 bg-white md:w-[min(100%,380px)] md:border-r ${
            mobileChat ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="border-b border-neutral-100 px-4 py-3">
            <p className="text-xs font-medium text-neutral-500">Conversations</p>
          </div>
          <div ref={listScrollRef} className="min-h-0 flex-1 overflow-y-auto">
            {loadingList && threads.length === 0 ? (
              <p className="p-4 text-sm text-neutral-500">Loading…</p>
            ) : listError ? (
              <p className="p-4 text-sm text-red-600">{listError}</p>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center gap-4 p-6 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm ring-1 ring-primary/10">
                  <EmptyChatIllustration className="size-8" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0a0a0a]">No conversations yet</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
                    Message a mentor from their profile, or wait for students to reach out.
                  </p>
                </div>
                <div className="flex w-full max-w-[240px] flex-col gap-2">
                  <Link
                    href="/mentors"
                    className="rounded-xl bg-primary px-4 py-2.5 text-center text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90"
                  >
                    Browse mentors
                  </Link>
                  <Link
                    href={backHref}
                    className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-center text-xs font-semibold text-[#0a0a0a] transition hover:bg-neutral-50"
                  >
                    Back to dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <ul>
                {threads.map((t) => {
                  const active = t.id === selectedId;
                  const ini = initials(t.peer.name, t.peer.email);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => selectThread(t.id)}
                        className={`flex w-full gap-3 border-b border-neutral-100 px-4 py-3 text-left transition hover:bg-neutral-50 ${
                          active ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {t.peer.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={t.peer.image}
                              alt=""
                              className="size-full rounded-full object-cover"
                            />
                          ) : (
                            ini
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-[#0a0a0a]">
                              {t.peer.name?.trim() || t.peer.email || "User"}
                            </span>
                            {t.status === CHAT_PENDING ? (
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                Request
                              </span>
                            ) : null}
                            {t.status === CHAT_DECLINED ? (
                              <span className="shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-700">
                                Declined
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-neutral-500">{t.peer.subtitle}</p>
                          {t.lastMessagePreview ? (
                            <p className="mt-0.5 truncate text-xs text-neutral-600">{t.lastMessagePreview}</p>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row xl:overflow-hidden ${
            !mobileChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Chat panel */}
          <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
          {selected ? (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-neutral-200 px-3 py-2.5">
                <button
                  type="button"
                  className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 md:hidden"
                  aria-label="Back to list"
                  onClick={() => setMobileChat(false)}
                >
                  ←
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {selected.peer.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selected.peer.image}
                        alt=""
                        className="size-full rounded-full object-cover"
                      />
                    ) : (
                      initials(selected.peer.name, selected.peer.email)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0a0a0a]">
                      {selected.peer.name?.trim() || selected.peer.email}
                    </p>
                    <p className="truncate text-xs text-neutral-500">{selected.peer.subtitle}</p>
                  </div>
                </div>
              </div>

              {!isMentor && threadStatus === CHAT_PENDING ? (
                <div className="shrink-0 border-b border-sky-200 bg-sky-50 px-4 py-2.5">
                  <p className="text-xs text-sky-950">
                    {studentPendingNote
                      ? "Your message was sent. The mentor will reply after they accept your request."
                      : "Send a message to request a conversation. The mentor must accept before they can reply."}
                  </p>
                </div>
              ) : null}

              {threadStatus === CHAT_DECLINED ? (
                <div className="shrink-0 border-b border-neutral-200 bg-neutral-100 px-4 py-2.5">
                  <p className="text-xs text-neutral-700">This conversation was declined.</p>
                </div>
              ) : null}

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {loadingMsgs && messages.length === 0 ? (
                  <p className="text-sm text-neutral-500">Loading messages…</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 sm:max-w-[65%] ${
                          m.isMine ? "bg-primary text-white" : "bg-neutral-100 text-[#0a0a0a]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                        <p
                          className={`mt-1 text-[10px] ${m.isMine ? "text-white/75" : "text-neutral-400"}`}
                        >
                          {formatMsgTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={msgsEndRef} />
                {loadingMsgs && messages.length > 0 ? (
                  <p className="text-center text-[11px] text-neutral-400">Updating…</p>
                ) : null}
                {msgError ? <p className="text-center text-xs text-red-600">{msgError}</p> : null}
              </div>

              <div className="shrink-0 border-t border-neutral-200 p-3">
                <div className="mx-auto flex max-w-3xl items-center gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={threadStatus === CHAT_DECLINED || !!mentorCannotSend}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    placeholder={
                      mentorCannotSend
                        ? "Accept the request to reply…"
                        : threadStatus === CHAT_DECLINED
                          ? "Conversation closed"
                          : "Type a message…"
                    }
                    className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-neutral-50"
                  />
                  <button
                    type="button"
                    onClick={() => void send()}
                    disabled={
                      sending ||
                      !draft.trim() ||
                      threadStatus === CHAT_DECLINED ||
                      !!mentorCannotSend
                    }
                    className="shrink-0 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : openingPeer ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="text-sm font-medium text-[#0a0a0a]">Opening conversation…</p>
              <p className="max-w-xs text-xs text-neutral-500">
                Connecting you to your chat. If this takes long, confirm you’re signed in as a student or mentor.
              </p>
            </div>
          ) : initialPeerId && !selectedId && listError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="text-sm font-medium text-red-700">Could not open chat</p>
              <p className="max-w-sm text-xs text-neutral-600">{listError}</p>
            </div>
          ) : loadingList && threads.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="size-10 animate-pulse rounded-full bg-primary/20" />
              <p className="text-sm font-medium text-neutral-600">Loading your conversations…</p>
            </div>
          ) : threads.length === 0 ? (
            <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-white via-neutral-50/80 to-primary/[0.04] p-8 text-center">
              <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,#0a0a0a_1px,transparent_0)] [background-size:20px_20px]" />
              <div className="relative z-[1] flex max-w-md flex-col items-center gap-5">
                <div className="flex size-20 items-center justify-center rounded-3xl bg-white shadow-md ring-1 ring-black/[0.06]">
                  <EmptyChatIllustration className="size-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-[#0a0a0a] sm:text-xl">
                    Start a conversation
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                    Your inbox is quiet for now. Explore mentors, open a profile, and tap{" "}
                    <span className="font-medium text-[#0a0a0a]">Message</span> to open a thread here—updates appear in
                    real time while you keep this tab open.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
                  <Link
                    href="/mentors"
                    className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90"
                  >
                    Find a mentor
                  </Link>
                  <Link
                    href={backHref}
                    className="inline-flex items-center justify-center rounded-full border-2 border-primary/30 bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary/5"
                  >
                    Back to dashboard
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-white via-neutral-50/50 to-transparent p-6 text-center sm:p-10">
              <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,#0a0a0a_1px,transparent_0)] [background-size:18px_18px]" />
              <div className="relative z-[1] flex max-w-lg flex-col items-center gap-4">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <EmptyChatIllustration className="size-9" />
                </div>
                <h2 className="text-base font-semibold text-[#0a0a0a] sm:text-lg">Choose a conversation</h2>
                <p className="max-w-sm text-sm leading-relaxed text-neutral-600">
                  Pick someone from the list on the left to read and send messages. On small screens, use the back
                  arrow above to return to your threads anytime.
                </p>
                <p className="max-w-sm text-xs text-neutral-400">
                  Tip: open a mentor profile and use Message to start a new thread—it will show up here
                  automatically.
                </p>
              </div>
            </div>
          )}
        </section>

          {role && selected ? (
            <>
              {contextPanelMobileOpen ? (
                <button
                  type="button"
                  className="fixed inset-0 z-40 bg-black/40 xl:hidden"
                  aria-label="Close profile panel"
                  onClick={() => setContextPanelMobileOpen(false)}
                />
              ) : null}
              <div
                className={`fixed inset-y-0 right-0 z-50 h-[100dvh] max-h-[100dvh] w-full max-w-md shadow-2xl xl:static xl:z-auto xl:flex xl:h-full xl:max-h-none xl:w-[min(380px,100%)] xl:max-w-[380px] xl:shadow-none ${
                  contextPanelMobileOpen ? "flex" : "hidden xl:flex"
                }`}
              >
                <ChatPeerInsightsPanel
                  viewerRole={role}
                  peer={selected.peer}
                  showClose
                  onClose={() => setContextPanelMobileOpen(false)}
                  className="h-full min-h-0 border-l border-neutral-200"
                />
              </div>
              {!contextPanelMobileOpen && !showMentorRequestModal ? (
                <button
                  type="button"
                  className="fixed bottom-24 right-4 z-30 flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:bg-primary/90 xl:hidden"
                  aria-label="Show profile and scheduling"
                  onClick={() => setContextPanelMobileOpen(true)}
                >
                  <IconUser className="size-5" />
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {showMentorRequestModal ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 sm:items-center sm:p-4">
          <div
            className="max-h-[min(85vh,520px)] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-h-none sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mentor-request-title"
          >
            <h2 id="mentor-request-title" className="text-lg font-semibold text-[#0a0a0a]">
              New message request
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              <span className="font-medium text-[#0a0a0a]">
                {selected?.peer.name?.trim() || selected?.peer.email || "A student"}
              </span>{" "}
              wants to chat with you. Accept to reply in this thread, or decline to close the request.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void onAcceptDecline("accept")}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 sm:flex-none sm:min-w-[7rem]"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => void onAcceptDecline("decline")}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#0a0a0a] transition hover:bg-neutral-50 sm:flex-none sm:min-w-[7rem]"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmptyChatIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <path
        d="M14 22c0-5 4.5-9 10-9s10 4 10 9-4.5 9-10 9c-1.2 0-2.4-.2-3.5-.5L14 38v-7.5c-2-1.8-3-4-3-8.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="19" cy="22" r="1.5" fill="currentColor" />
      <circle cx="24" cy="22" r="1.5" fill="currentColor" />
      <circle cx="29" cy="22" r="1.5" fill="currentColor" />
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
