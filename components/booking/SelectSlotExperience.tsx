"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { MentorAvatar } from "@/components/mentors/MentorAvatar";
import type { SelectSlotPickerPayload } from "@/lib/booking-slot-selection-data";

type Props = {
  initialPayload: SelectSlotPickerPayload;
};

export function SelectSlotExperience({ initialPayload }: Props) {
  const [slots, setSlots] = useState(initialPayload.slots);
  const [selectedISO, setSelectedISO] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMeetLink, setSuccessMeetLink] = useState<string | null>(null);
  /** Stop polling after success or when the API reports this booking no longer needs a picker. */
  const [stopPolling, setStopPolling] = useState(false);
  const [blockedNotice, setBlockedNotice] = useState<{ title: string; message: string } | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const bookingId = initialPayload.bookingRequestId;
  const catalogToken = initialPayload.catalogToken;

  const pollUrl = `/api/booking-requests/select-slot-state?bookingId=${encodeURIComponent(bookingId)}&token=${encodeURIComponent(catalogToken)}`;

  const refreshSlots = useCallback(async () => {
    if (stopPolling) return;
    try {
      const res = await fetch(pollUrl, { cache: "no-store", credentials: "same-origin" });
      const text = await res.text();
      let data: {
        ok?: boolean;
        payload?: SelectSlotPickerPayload;
        notice?: { kind?: string; title: string; message: string };
      };
      try {
        data = text ? (JSON.parse(text) as typeof data) : {};
      } catch {
        return;
      }
      if (!data.ok && data.notice?.title) {
        setBlockedNotice({ title: data.notice.title, message: data.notice.message });
        setStopPolling(true);
        return;
      }
      if (data.ok && data.payload?.slots) {
        setSlots(data.payload.slots);
      }
    } catch {
      /* ignore transient poll failures */
    }
  }, [pollUrl, stopPolling]);

  useEffect(() => {
    if (stopPolling) {
      if (pollTimerRef.current != null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    void refreshSlots();

    pollTimerRef.current = window.setInterval(() => {
      void refreshSlots();
    }, 12_000);

    return () => {
      if (pollTimerRef.current != null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [refreshSlots, stopPolling]);

  useEffect(() => {
    if (!selectedISO) return;
    const row = slots.find((s) => s.startISO === selectedISO);
    if (!row || row.disabled) setSelectedISO(null);
  }, [slots, selectedISO]);

  async function confirmBooking() {
    if (!selectedISO || submitting) return;
    setSubmitting(true);
    setErrorBanner(null);
    try {
      const res = await fetch("/api/booking-requests/confirm-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          bookingRequestId: bookingId,
          catalogToken,
          slotStartISO: selectedISO,
        }),
      });
      const text = await res.text();
      let data: {
        ok?: boolean;
        title?: string;
        message?: string;
        meetLink?: string | null;
      };
      try {
        data = text ? (JSON.parse(text) as typeof data) : {};
      } catch {
        setErrorBanner("The server returned an unexpected response. Try again in a moment.");
        await refreshSlots();
        return;
      }

      if (!res.ok || !data.ok) {
        setErrorBanner(data.message ?? data.title ?? "Could not confirm this time. Try another slot.");
        await refreshSlots();
        return;
      }

      const title = typeof data.title === "string" ? data.title.trim() : "";

      if (title === "Processing") {
        setErrorBanner(data.message ?? "Another confirmation is finishing. Wait a few seconds, then try again.");
        await refreshSlots();
        return;
      }

      if (title === "Already confirmed" || title === "Already handled") {
        setStopPolling(true);
        setBlockedNotice({
          title: title === "Already handled" ? "Already updated" : "Already confirmed",
          message: data.message ?? "This booking was already finalized.",
        });
        return;
      }

      if (title === "Confirmed") {
        setStopPolling(true);
        setSuccessMeetLink(typeof data.meetLink === "string" ? data.meetLink.trim() || null : null);
        setSuccessOpen(true);
        return;
      }

      setErrorBanner(data.message ?? "Unexpected response from the server. Try again or refresh the page.");
      await refreshSlots();
    } catch {
      setErrorBanner("Network error — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const mentor = initialPayload.mentor;
  const student = initialPayload.student;

  if (blockedNotice) {
    return (
      <main className="min-h-[100dvh] bg-[#fafafa] px-4 py-10">
        <div className="mx-auto max-w-md rounded-2xl border border-black/[0.08] bg-white px-5 py-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Commonsia</p>
          <h1 className="mt-2 font-heading text-lg font-semibold text-[#b45309]">{blockedNotice.title}</h1>
          <p className="mt-2 text-[13px] leading-snug text-neutral-700">{blockedNotice.message}</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-[100dvh] bg-[#fafafa] px-4 py-8 pb-14">
        <div className="mx-auto max-w-3xl space-y-6">
          <header className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Commonsia</p>
            <h1 className="mt-2 font-heading text-xl font-semibold text-[#0a0a0a] sm:text-2xl">Choose session time</h1>
            <p className="mt-2 text-[13px] leading-snug text-neutral-600">
              Pick one start time below, then confirm. Calendar invites are sent automatically when possible.
            </p>
          </header>

          <section className="grid gap-4 rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm md:grid-cols-2 md:p-6">
            <div className="flex gap-4 border-b border-black/[0.06] pb-5 md:border-b-0 md:border-r md:pb-0 md:pr-5">
              <div className="relative h-[5.25rem] w-[5.25rem] shrink-0 overflow-hidden rounded-2xl border border-black/[0.08] bg-neutral-100">
                <MentorAvatar
                  name={mentor.name}
                  imageUrl={mentor.imageUrl}
                  hasProfilePhoto={mentor.hasProfilePhoto}
                  variant="profile"
                  sizes="84px"
                  priority
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Mentor</p>
                <p className="mt-1 truncate font-semibold text-[#0a0a0a]">{mentor.name}</p>
                <p className="mt-1 line-clamp-3 text-[13px] leading-snug text-neutral-600">
                  {mentor.expertiseLine.trim() ? mentor.expertiseLine : "—"}
                </p>
              </div>
            </div>

            <div className="flex gap-4 md:pl-1">
              <div className="relative h-[5.25rem] w-[5.25rem] shrink-0 overflow-hidden rounded-2xl border border-black/[0.08] bg-neutral-100">
                <MentorAvatar
                  name={student.name}
                  imageUrl={student.imageUrl}
                  hasProfilePhoto={student.hasProfilePhoto}
                  variant="profile"
                  sizes="84px"
                  priority
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Student</p>
                <p className="mt-1 truncate font-semibold text-[#0a0a0a]">{student.name}</p>
                <p className="mt-1 text-[13px] text-neutral-600">
                  {[student.university, student.yearOfStudy].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-black/[0.08] bg-white px-5 py-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Requested window</p>
            <p className="mt-1 text-[15px] font-semibold text-[#0a0a0a]">{initialPayload.requestedDateLabel}</p>
            <p className="mt-0.5 text-[13px] text-neutral-600">{initialPayload.requestedRangeLabel}</p>
          </section>

          <section className="rounded-2xl border border-black/[0.08] bg-white px-5 py-6 shadow-sm">
            <h2 className="font-heading text-[15px] font-semibold text-[#0a0a0a]">Available start times</h2>
            <p className="mt-1 text-[12px] text-neutral-500">Unavailable times overlap another booking.</p>

            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {slots.map((slot) => {
                const selected = selectedISO === slot.startISO && !slot.disabled;
                return (
                  <button
                    key={slot.startISO}
                    type="button"
                    disabled={slot.disabled}
                    onClick={() => !slot.disabled && setSelectedISO(slot.startISO)}
                    className={`rounded-xl border px-2 py-2.5 text-center text-[12px] font-semibold transition sm:text-[13px] ${
                      slot.disabled
                        ? "cursor-not-allowed border-black/[0.06] bg-neutral-50 text-neutral-400 line-through decoration-neutral-400"
                        : selected
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/35"
                          : "border-black/[0.1] bg-neutral-50 text-[#0a0a0a] hover:border-primary/35 hover:bg-white"
                    }`}
                  >
                    {slot.labelShort}
                  </button>
                );
              })}
            </div>

            {errorBanner ? (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-950" role="alert">
                {errorBanner}
              </p>
            ) : null}

            <button
              type="button"
              disabled={!selectedISO || submitting}
              onClick={confirmBooking}
              className="mt-6 w-full rounded-xl bg-primary px-4 py-3.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Confirming…" : "Confirm booking"}
            </button>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {successOpen ? (
          <motion.div
            className="fixed inset-0 z-[220] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
              aria-label="Close"
              onClick={() => setSuccessOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="slot-booked-title"
              className="relative z-10 w-full max-w-md rounded-2xl border border-black/5 bg-white px-7 py-9 text-center shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
            >
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-100 text-2xl" aria-hidden>
                {"\u2713"}
              </div>
              <h2 id="slot-booked-title" className="font-heading text-lg font-semibold text-[#0a0a0a]">
                Session booked successfully
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-neutral-600">
                Google Calendar invitations are sent when your workspace is configured. You can also join from the Meet
                link below when available.
              </p>
              {successMeetLink ? (
                <a
                  href={successMeetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex max-w-full break-all rounded-xl bg-primary/10 px-4 py-2 text-[13px] font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Open Google Meet
                </a>
              ) : (
                <p className="mt-5 text-[13px] text-neutral-500">Check your email or Calendar invite for the Meet link.</p>
              )}
              <button
                type="button"
                onClick={() => setSuccessOpen(false)}
                className="mt-8 w-full rounded-xl border border-black/[0.1] bg-white px-4 py-3 text-[13px] font-semibold text-[#0a0a0a] hover:bg-neutral-50"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
