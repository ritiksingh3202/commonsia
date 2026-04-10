"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { MENTOR_MENTEE_CAPACITY_OPTIONS, MENTOR_SESSION_PREFS } from "@/components/mentor/mentor-setup-constants";
import { MentorSetupShell } from "@/components/mentor/MentorSetupShell";
import { SetupLinkedInNotice } from "@/components/setup/SetupLinkedInNotice";
import { setupField, setupLabel } from "@/components/student/student-ui";
import { useProfileAutosave } from "@/hooks/useProfileAutosave";
import type { MentorSetupUserSnapshot } from "@/lib/setup-load-user";

const btnGhost =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md border border-black/10 bg-white py-2.5 text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-neutral-50 sm:text-sm";

const btnPrimary =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 sm:text-sm";

export function MentorSetupStep2({
  initial,
  linkedInConnected,
}: {
  initial?: MentorSetupUserSnapshot;
  linkedInConnected?: boolean;
}) {
  const router = useRouter();
  const scheduleSave = useProfileAutosave();

  const [focus, setFocus] = useState(initial?.mentorMentorshipFocus ?? "");
  const [avail, setAvail] = useState(() => {
    const v = initial?.mentorAvailabilityPref;
    return v && (MENTOR_SESSION_PREFS as readonly string[]).includes(v) ? v : "Weekly session";
  });
  const [cap, setCap] = useState(() => {
    const v = initial?.mentorMaxMenteesPref;
    return v && (MENTOR_MENTEE_CAPACITY_OPTIONS as readonly string[]).includes(v) ? v : "3–5 students";
  });

  return (
    <MentorSetupShell step={2} backHref="/mentor/setup/1">
      <section>
        {linkedInConnected ? <SetupLinkedInNotice variant="mentor" /> : null}
        <h2 className="mb-3 text-base font-semibold text-[#0a0a0a]">Mentorship Preferences</h2>
        <p className="mb-3 text-[12px] text-[#6b7280]">Changes save automatically.</p>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!focus.trim()) {
              window.alert("Please describe what you would like to mentor students on.");
              return;
            }
            const res = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                mentorMentorshipFocus: focus.trim(),
                mentorAvailabilityPref: avail || null,
                mentorMaxMenteesPref: cap || null,
              }),
            });
            if (!res.ok) {
              window.alert("Could not save. Try signing in again.");
              return;
            }
            router.push("/mentor/setup/3");
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="mentorMentorshipFocus" className={setupLabel}>
              What would you like to mentor students on?
            </label>
            <textarea
              id="mentorMentorshipFocus"
              name="mentorMentorshipFocus"
              rows={5}
              required
              value={focus}
              onChange={(e) => {
                const v = e.target.value;
                setFocus(v);
                scheduleSave({ mentorMentorshipFocus: v.trim() || null });
              }}
              placeholder="e.g., Portfolio development, career guidance, software skills, design critique..."
              className={`${setupField} min-h-[120px] resize-y`}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mentorAvailabilityPref" className={setupLabel}>
              Availability
            </label>
            <div className="relative">
              <select
                id="mentorAvailabilityPref"
                name="mentorAvailabilityPref"
                value={avail}
                onChange={(e) => {
                  const v = e.target.value;
                  setAvail(v);
                  scheduleSave({ mentorAvailabilityPref: v || null });
                }}
                className={`${setupField} appearance-none pr-9`}
              >
                {MENTOR_SESSION_PREFS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#717182]">
                <ChevronDown />
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mentorMaxMenteesPref" className={setupLabel}>
              Maximum Number of Mentees
            </label>
            <div className="relative">
              <select
                id="mentorMaxMenteesPref"
                name="mentorMaxMenteesPref"
                value={cap}
                onChange={(e) => {
                  const v = e.target.value;
                  setCap(v);
                  scheduleSave({ mentorMaxMenteesPref: v || null });
                }}
                className={`${setupField} appearance-none pr-9`}
              >
                {MENTOR_MENTEE_CAPACITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#717182]">
                <ChevronDown />
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <button type="button" onClick={() => router.push("/mentor/setup/1")} className={btnGhost}>
              <ArrowLeft className="size-3.5" />
              Previous
            </button>
            <button type="submit" className={btnPrimary}>
              Next: Profile &amp; Links
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </form>
      </section>
    </MentorSetupShell>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-4">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
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
