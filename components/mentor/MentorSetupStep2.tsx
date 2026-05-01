"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  MENTORSHIP_PREFERENCE_OPTIONS,
  mentorMentorshipSelectionsFromStored,
  mentorMentorshipSerializeSelections,
} from "@/components/mentor/mentor-setup-constants";
import { MentorMentorshipPreferenceCard } from "@/components/mentor/MentorMentorshipPreferenceCard";
import { MentorSetupShell } from "@/components/mentor/MentorSetupShell";
import { SetupLinkedInNotice } from "@/components/setup/SetupLinkedInNotice";
import { setupRequiredStar } from "@/components/student/student-ui";
import { useProfileAutosave } from "@/hooks/useProfileAutosave";
import type { MentorSetupUserSnapshot } from "@/lib/setup-load-user";

const btnGhost =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md border border-black/10 bg-white py-2.5 text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-neutral-50 sm:text-sm";

const btnPrimary =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-primary sm:text-sm";

const cardClass =
  "flex cursor-pointer gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50/50 sm:p-4";

export function MentorSetupStep2({
  initial,
  linkedInConnected,
}: {
  initial?: MentorSetupUserSnapshot;
  linkedInConnected?: boolean;
}) {
  const router = useRouter();
  const { schedule: scheduleSave, cancelPending } = useProfileAutosave(400);

  const initialSet = useMemo(
    () => mentorMentorshipSelectionsFromStored(initial?.mentorMentorshipFocus),
    [initial?.mentorMentorshipFocus],
  );
  const [selected, setSelected] = useState(() => initialSet);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    router.prefetch("/mentor/setup/1");
    router.prefetch("/mentor/setup/3");
  }, [router]);

  const toggle = (title: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      const serialized = mentorMentorshipSerializeSelections(next);
      scheduleSave({ mentorMentorshipFocus: serialized || null });
      return next;
    });
  };

  return (
    <MentorSetupShell step={2} backHref="/mentor/setup/1">
      <section>
        {linkedInConnected ? <SetupLinkedInNotice variant="mentor" /> : null}
        <h2 className="mb-1 text-base font-semibold text-[#0a0a0a]">
          Mentorship preferences
          <span className={setupRequiredStar} title="Required" aria-hidden>
            *
          </span>
        </h2>
        <p className="mb-1 text-[12px] leading-snug text-[#6b7280]">
          What would you like to mentor students on? Select all that apply.
        </p>
        <p className="mb-4 text-[12px] text-[#6b7280]">Changes save automatically.</p>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (saving) return;
            if (selected.size === 0) {
              window.alert("Please select at least one mentorship preference.");
              return;
            }
            const serialized = mentorMentorshipSerializeSelections(selected);
            cancelPending();
            setSaving(true);
            try {
              const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  mentorMentorshipFocus: serialized,
                }),
              });
              if (!res.ok) {
                window.alert("Could not save. Try signing in again.");
                setSaving(false);
                return;
              }
              router.push("/mentor/setup/3");
            } catch {
              window.alert("Network error. Check your connection and try again.");
              setSaving(false);
            }
          }}
        >
          <div className="space-y-2.5">
            <div className="flex flex-col gap-2.5" role="group" aria-label="Mentorship focus areas">
              {MENTORSHIP_PREFERENCE_OPTIONS.map((opt) => {
                const isOn = selected.has(opt.title);
                return (
                  <MentorMentorshipPreferenceCard
                    key={opt.id}
                    fieldId={`mentor-setup-mentorship-${opt.id}`}
                    title={opt.title}
                    description={opt.description}
                    checked={isOn}
                    onCheckedChange={() => toggle(opt.title)}
                    cardClassName={cardClass}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4 sm:flex-row">
            <button type="button" onClick={() => router.push("/mentor/setup/1")} className={btnGhost}>
              <ArrowLeft className="size-3.5" />
              Previous
            </button>
            <button type="submit" className={btnPrimary} disabled={saving} aria-busy={saving}>
              {saving ? (
                <>
                  <SpinnerIcon className="size-3.5" />
                  Saving…
                </>
              ) : (
                <>
                  Next: Profile &amp; Links
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </MentorSetupShell>
  );
}

function ArrowLeft({ className }: { className?: string }) {
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

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={`${className ?? ""} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
