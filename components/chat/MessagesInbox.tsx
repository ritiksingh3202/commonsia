"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CHAT_DECLINED, CHAT_PENDING } from "@/lib/chat-thread-status";

type Peer = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  subtitle: string;
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
  backHref,
}: {
  initialPeerId: string | null;
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
  const [mobileChat, setMobileChat] = useState(false);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const msgsEndRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => threads.find((t) => t.id === selectedId) ?? null,
    [threads, selectedId],
  );

  const isMentor = role === "mentor";
  const mentorCannotSend = selected && selected.status === CHAT_PENDING && isMentor;
  const studentPendingNote =
    selected && selected.status === CHAT_PENDING && !isMentor && messages.length > 0;

  const loadThreads = useCallback(async () => {
    setListError(null);
    const res = await fetch("/api/chat/threads");
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
    setThreads(data.threads);
    setRole(data.role);
    setLoadingList(false);
    return data;
  }, []);

  const openOrCreatePeer = useCallback(
    async (peerUserId: string) => {
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
      setSelectedId(data.thread.id);
      setMobileChat(true);
      await loadThreads();
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
    if (!initialPeerId || loadingList) return;
    const t = window.setTimeout(() => {
      void openOrCreatePeer(initialPeerId);
    }, 0);
    return () => window.clearTimeout(t);
  }, [initialPeerId, loadingList, openOrCreatePeer]);

  const loadMessages = useCallback(async (threadId: string) => {
    setLoadingMsgs(true);
    setMsgError(null);
    const res = await fetch(`/api/chat/threads/${threadId}/messages`);
    if (!res.ok) {
      setMsgError("Could not load messages");
      setLoadingMsgs(false);
      return;
    }
    const data = (await res.json()) as { status: string; messages: ChatMessageRow[] };
    setThreadStatus(data.status);
    setMessages(data.messages);
    setLoadingMsgs(false);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      const clearT = window.setTimeout(() => {
        setMessages([]);
        setThreadStatus(null);
      }, 0);
      return () => window.clearTimeout(clearT);
    }
    const kick = window.setTimeout(() => {
      void loadMessages(selectedId);
    }, 0);
    const poll = window.setInterval(() => void loadMessages(selectedId), 4500);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(poll);
    };
  }, [selectedId, loadMessages]);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const id = window.setInterval(() => void loadThreads(), 12000);
    return () => window.clearInterval(id);
  }, [loadThreads]);

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

      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col md:flex-row md:overflow-hidden">
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
            {loadingList ? (
              <p className="p-4 text-sm text-neutral-500">Loading…</p>
            ) : listError ? (
              <p className="p-4 text-sm text-red-600">{listError}</p>
            ) : threads.length === 0 ? (
              <p className="p-4 text-sm text-neutral-500">No messages yet. Open a profile and tap Message.</p>
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

        {/* Chat panel */}
        <section
          className={`flex min-h-0 min-w-0 flex-1 flex-col bg-white ${
            !mobileChat ? "hidden md:flex" : "flex"
          }`}
        >
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

              {isMentor && threadStatus === CHAT_PENDING ? (
                <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm font-medium text-amber-950">New message request</p>
                  <p className="mt-1 text-xs text-amber-900/90">
                    Accept to reply, or decline to close this request.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void onAcceptDecline("accept")}
                      className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => void onAcceptDecline("decline")}
                      className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-[#0a0a0a] hover:bg-neutral-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ) : null}

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
                {loadingMsgs ? (
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
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-neutral-500">
              Select a conversation
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
