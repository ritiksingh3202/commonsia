"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

import { StudentSetupShell } from "./StudentSetupShell";
import { setupField, setupLabel } from "./student-ui";

const btnGhost =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md border border-black/10 bg-white py-2.5 text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-neutral-50 sm:text-sm";

const btnPrimary =
  "flex flex-1 items-center justify-center rounded-md bg-primary py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 sm:text-sm";

export function StudentSetupStep3() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <StudentSetupShell step={3} backHref="/student/setup/2">
      <section>
        <h2 className="mb-3 text-base font-semibold text-[#0a0a0a]">Portfolio &amp; Bio</h2>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const res = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bio: String(fd.get("about") ?? "").trim() || null,
                portfolioUrl: String(fd.get("portfolioUrl") ?? "").trim() || null,
                profileComplete: true,
              }),
            });
            if (!res.ok) {
              window.alert("Could not save your profile. Try signing in again.");
              return;
            }
            router.push("/student");
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="about" className={setupLabel}>
              About You
            </label>
            <textarea
              id="about"
              name="about"
              rows={4}
              placeholder="Tell mentors about yourself, your goals, and what you're looking for in a mentor..."
              className={`${setupField} min-h-[100px] resize-y`}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="portfolioUrl" className={setupLabel}>
              Portfolio URL (Optional)
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
            <span className={setupLabel}>Upload Portfolio (Optional)</span>
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

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:gap-2">
            <button type="button" onClick={() => router.push("/student/setup/2")} className={btnGhost}>
              <ArrowLeft className="size-3.5" />
              Previous
            </button>
            <button type="submit" className={btnPrimary}>
              Complete Profile
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
