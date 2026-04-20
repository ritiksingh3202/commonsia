"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { StudentSetupShell } from "./StudentSetupShell";
import { setupField, setupLabel, setupRequiredStar } from "./student-ui";
import { SetupGoogleCalendarConnect } from "@/components/setup/SetupGoogleCalendarConnect";
import { SetupLinkedInNotice } from "@/components/setup/SetupLinkedInNotice";
import { useProfileAutosave } from "@/hooks/useProfileAutosave";
import type { StudentSetupUserSnapshot } from "@/lib/setup-load-user";

const btnGhost =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md border border-black/10 bg-white py-2.5 text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-neutral-50 sm:text-sm";

const btnPrimary =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 sm:text-sm";

export function StudentSetupStep3({
  initial,
  linkedInConnected,
  googleCalendarConnected = false,
}: {
  initial?: StudentSetupUserSnapshot;
  linkedInConnected?: boolean;
  googleCalendarConnected?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { schedule: scheduleSave, flushNow } = useProfileAutosave();

  const [bio, setBio] = useState(initial?.bio ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(initial?.linkedinUrl ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(initial?.portfolioUrl ?? "");

  return (
    <StudentSetupShell step={3} backHref="/student/setup/2">
      <section>
        {linkedInConnected ? <SetupLinkedInNotice variant="student" /> : null}
        <h2 className="mb-1 text-base font-semibold text-[#0a0a0a]">
          Portfolio &amp; bio
          <span className={setupRequiredStar} title="Required fields below" aria-hidden>
            *
          </span>
        </h2>
        <p className="mb-1 text-[12px] leading-snug text-[#6b7280]">
          About you and LinkedIn are required. Portfolio link and file upload are optional.
        </p>
        <p className="mb-3 text-[12px] text-[#6b7280]">Changes save automatically.</p>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const text = bio.trim();
            if (!text) {
              window.alert("Please write something in About you.");
              return;
            }
            const li = linkedinUrl.trim();
            if (!li) {
              window.alert("Please add your LinkedIn profile URL.");
              return;
            }
            if (!googleCalendarConnected) {
              window.alert("Please connect Google Calendar before completing your profile.");
              return;
            }
            await flushNow();
            const res = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                role: "student",
                bio: text,
                linkedinUrl: li,
                portfolioUrl: portfolioUrl.trim() || null,
                profileComplete: true,
              }),
            });
            if (!res.ok) {
              window.alert("Could not save your profile. Try signing in again.");
              return;
            }
            router.push("/student?welcome=1");
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="about" className={setupLabel}>
              About you <span className="text-primary">*</span>
            </label>
            <textarea
              id="about"
              name="about"
              rows={6}
              value={bio}
              onChange={(e) => {
                const v = e.target.value;
                setBio(v);
                scheduleSave({ bio: v.trim() || null });
              }}
              placeholder="Tell mentors about yourself, your goals, and what you're looking for in a mentor..."
              className={`${setupField} min-h-[120px] resize-y`}
              required
            />
            <p className="text-[11px] leading-snug text-[#6b7280] sm:text-xs">
              A short, genuine bio helps mentors understand how to support you. LinkedIn OpenID does not provide a
              long bio — write it here.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="linkedinUrl" className={setupLabel}>
              LinkedIn profile URL <span className="text-primary">*</span>
            </label>
            <input
              id="linkedinUrl"
              name="linkedinUrl"
              type="url"
              value={linkedinUrl}
              onChange={(e) => {
                const v = e.target.value;
                setLinkedinUrl(v);
                scheduleSave({ linkedinUrl: v.trim() || null });
              }}
              placeholder="https://linkedin.com/in/your-profile"
              className={setupField}
              required
              autoComplete="url"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="portfolioUrl" className={setupLabel}>
              Portfolio URL <span className="font-normal text-[#9ca3af]">(Optional)</span>
            </label>
            <input
              id="portfolioUrl"
              name="portfolioUrl"
              type="url"
              value={portfolioUrl}
              onChange={(e) => {
                const v = e.target.value;
                setPortfolioUrl(v);
                scheduleSave({ portfolioUrl: v.trim() || null });
              }}
              placeholder="https://yourportfolio.com"
              className={setupField}
            />
          </div>

          <div className="space-y-1.5">
            <span className={setupLabel}>
              Upload portfolio <span className="font-normal text-[#9ca3af]">(Optional)</span>
            </span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#d1d5dc] bg-white px-3 py-6 text-center transition-colors hover:border-primary/35 hover:bg-neutral-50/80"
            >
              <UploadIcon className="mb-2 size-8 text-[#4a5565]" />
              <p className="text-[13px] font-medium text-[#4a5565]">Click to upload PDF or ZIP file</p>
              <p className="mt-0.5 text-[11px] font-medium text-[#99a1af]">Max file size: 10MB</p>
              <input ref={fileRef} type="file" accept=".pdf,.zip,application/pdf,application/zip" className="hidden" />
            </button>
          </div>

          <SetupGoogleCalendarConnect
            connected={googleCalendarConnected}
            returnPath="/student/setup/3"
            required
            description="Required. Sessions are added to Google Calendar. If you signed in with Google, you may already be connected — otherwise use Connect below."
          />

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:gap-2">
            <button type="button" onClick={() => router.push("/student/setup/2")} className={btnGhost}>
              <ArrowLeft className="size-3.5" />
              Previous
            </button>
            <button
              type="submit"
              disabled={!googleCalendarConnected}
              className={`${btnPrimary} ${!googleCalendarConnected ? "opacity-50" : ""}`}
            >
              Complete profile
            </button>
          </div>
        </form>
      </section>
    </StudentSetupShell>
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

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 16V8m0 0l3 3m-3-3L9 11M4 16.8V19a2 2 0 002 2h12a2 2 0 002-2v-2.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
