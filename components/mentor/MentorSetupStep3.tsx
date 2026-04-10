"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { MentorSetupShell } from "@/components/mentor/MentorSetupShell";
import { SetupLinkedInNotice } from "@/components/setup/SetupLinkedInNotice";
import { setupField, setupLabel } from "@/components/student/student-ui";
import { useProfileAutosave } from "@/hooks/useProfileAutosave";
import type { MentorSetupUserSnapshot } from "@/lib/setup-load-user";

const btnGhost =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md border border-black/10 bg-white py-2.5 text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-neutral-50 sm:text-sm";

const btnPrimary =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 sm:text-sm";

export function MentorSetupStep3({
  initial,
  linkedInConnected,
}: {
  initial?: MentorSetupUserSnapshot;
  linkedInConnected?: boolean;
}) {
  const router = useRouter();
  const scheduleSave = useProfileAutosave();

  const [bio, setBio] = useState(initial?.bio ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(initial?.linkedinUrl ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(initial?.portfolioUrl ?? "");
  const [mentorCertifications, setMentorCertifications] = useState(initial?.mentorCertifications ?? "");
  const [bannerImageUrl, setBannerImageUrl] = useState(initial?.bannerImageUrl ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");

  return (
    <MentorSetupShell step={3} backHref="/mentor/setup/2">
      <section>
        {linkedInConnected ? <SetupLinkedInNotice variant="mentor" /> : null}
        <h2 className="mb-3 text-base font-semibold text-[#0a0a0a]">Professional Profile</h2>
        <p className="mb-3 text-[12px] text-[#6b7280]">Changes save automatically.</p>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!bio.trim()) {
              window.alert("Please add a short professional bio.");
              return;
            }
            const res = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bio: bio.trim(),
                linkedinUrl: linkedinUrl.trim() || null,
                portfolioUrl: portfolioUrl.trim() || null,
                mentorCertifications: mentorCertifications.trim() || null,
                bannerImageUrl: bannerImageUrl.trim() || null,
                phone: phone.trim() || null,
              }),
            });
            if (!res.ok) {
              window.alert("Could not save. Try signing in again.");
              return;
            }
            router.push("/mentor/availability");
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="bio" className={setupLabel}>
              Professional Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={5}
              required
              value={bio}
              onChange={(e) => {
                const v = e.target.value;
                setBio(v);
                scheduleSave({ bio: v.trim() || null });
              }}
              placeholder="Tell students about your background, accomplishments, and why you want to mentor..."
              className={`${setupField} min-h-[120px] resize-y`}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="linkedinUrl" className={setupLabel}>
              LinkedIn Profile
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
              placeholder="https://linkedin.com/in/yourprofile"
              className={setupField}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="portfolioUrl" className={setupLabel}>
              Portfolio / Website <span className="font-normal text-[#9ca3af]">(Optional)</span>
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
            <label htmlFor="bannerImageUrl" className={setupLabel}>
              Cover / banner image URL <span className="font-normal text-[#9ca3af]">(Optional)</span>
            </label>
            <input
              id="bannerImageUrl"
              name="bannerImageUrl"
              type="url"
              value={bannerImageUrl}
              onChange={(e) => {
                const v = e.target.value;
                setBannerImageUrl(v);
                scheduleSave({ bannerImageUrl: v.trim() || null });
              }}
              placeholder="https://… (HTTPS image — LinkedIn does not expose cover via OpenID)"
              className={setupField}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="phone" className={setupLabel}>
              Phone <span className="font-normal text-[#9ca3af]">(Optional)</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                const v = e.target.value;
                setPhone(v);
                scheduleSave({ phone: v.trim() || null });
              }}
              placeholder="Not available from LinkedIn sign-in — enter if you want mentors to reach you"
              className={setupField}
              autoComplete="tel"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="mentorCertifications" className={setupLabel}>
              Certifications &amp; Credentials <span className="font-normal text-[#9ca3af]">(Optional)</span>
            </label>
            <input
              id="mentorCertifications"
              name="mentorCertifications"
              type="text"
              value={mentorCertifications}
              onChange={(e) => {
                const v = e.target.value;
                setMentorCertifications(v);
                scheduleSave({ mentorCertifications: v.trim() || null });
              }}
              placeholder="e.g., LEED AP, AIA, RIBA"
              className={setupField}
            />
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <button type="button" onClick={() => router.push("/mentor/setup/2")} className={btnGhost}>
              <ArrowLeft className="size-3.5" />
              Previous
            </button>
            <button type="submit" className={btnPrimary}>
              Next: Set Availability
              <ArrowRight className="size-3.5" />
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
