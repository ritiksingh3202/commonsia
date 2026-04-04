"use client";

import { useRouter } from "next/navigation";

import { MentorSetupShell } from "@/components/mentor/MentorSetupShell";
import { setupField, setupLabel } from "@/components/student/student-ui";

const btnGhost =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md border border-black/10 bg-white py-2.5 text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-neutral-50 sm:text-sm";

const btnPrimary =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 sm:text-sm";

export function MentorSetupStep3() {
  const router = useRouter();

  return (
    <MentorSetupShell step={3} backHref="/mentor/setup/2">
      <section>
        <h2 className="mb-3 text-base font-semibold text-[#0a0a0a]">Professional Profile</h2>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const bio = String(fd.get("bio") ?? "").trim();
            if (!bio) {
              window.alert("Please add a short professional bio.");
              return;
            }
            const res = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bio,
                linkedinUrl: String(fd.get("linkedinUrl") ?? "").trim() || null,
                portfolioUrl: String(fd.get("portfolioUrl") ?? "").trim() || null,
                mentorCertifications: String(fd.get("mentorCertifications") ?? "").trim() || null,
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
              placeholder="https://yourportfolio.com"
              className={setupField}
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
