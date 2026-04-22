"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MentorSetupShell } from "@/components/mentor/MentorSetupShell";
import { SetupLinkedInNotice } from "@/components/setup/SetupLinkedInNotice";
import { setupField, setupLabel, setupRequiredStar } from "@/components/student/student-ui";
import { useProfileAutosave } from "@/hooks/useProfileAutosave";
import { normalizeLinkedInUrl, normalizeWhatsappUrl } from "@/lib/mentor-contact-urls";
import type { MentorSetupUserSnapshot } from "@/lib/setup-load-user";

const btnGhost =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md border border-black/10 bg-white py-2.5 text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-neutral-50 sm:text-sm";

const btnPrimary =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-primary sm:text-sm";

export function MentorSetupStep3({
  initial,
  linkedInConnected,
}: {
  initial?: MentorSetupUserSnapshot;
  linkedInConnected?: boolean;
}) {
  const router = useRouter();
  const { schedule: scheduleSave, cancelPending } = useProfileAutosave();

  const [bio, setBio] = useState(initial?.bio ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(initial?.linkedinUrl ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(initial?.portfolioUrl ?? "");
  const [mentorCertifications, setMentorCertifications] = useState(initial?.mentorCertifications ?? "");
  const [whatsappUrl, setWhatsappUrl] = useState(initial?.whatsappUrl ?? "");
  const [portfolioFileLabel, setPortfolioFileLabel] = useState(initial?.portfolioFileName ?? "");
  const [saving, setSaving] = useState(false);
  const portfolioFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPortfolioFileLabel(initial?.portfolioFileName ?? "");
  }, [initial?.portfolioFileName]);

  const onPortfolioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    try {
      const res = await fetch("/api/profile/portfolio-file", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Upload failed");
      }
      setPortfolioFileLabel(file.name);
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  const clearPortfolioFile = async () => {
    try {
      const res = await fetch("/api/profile/portfolio-file", { method: "DELETE" });
      if (!res.ok) throw new Error("Remove failed");
      setPortfolioFileLabel("");
      router.refresh();
    } catch {
      window.alert("Could not remove file. Try again.");
    }
  };

  return (
    <MentorSetupShell step={3} backHref="/mentor/setup/2">
      <section>
        {linkedInConnected ? <SetupLinkedInNotice variant="mentor" /> : null}
        <h2 className="mb-1 text-base font-semibold text-[#0a0a0a]">
          Profile &amp; professional links
          <span className={setupRequiredStar} title="Required" aria-hidden>
            *
          </span>
        </h2>
        <p className="mb-1 text-[12px] leading-snug text-[#6b7280]">
          Professional bio, WhatsApp number, and LinkedIn are required. Portfolio link, PDF upload, and certifications
          are optional.
        </p>
        <p className="mb-3 text-[12px] text-[#6b7280]">Changes save automatically.</p>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (saving) return;
            if (!bio.trim()) {
              window.alert("Please add a professional bio.");
              return;
            }
            const wa = normalizeWhatsappUrl(whatsappUrl);
            if (!wa) {
              window.alert("Enter a valid WhatsApp number (with country code) or a WhatsApp link (https://wa.me/…).");
              return;
            }
            const li = normalizeLinkedInUrl(linkedinUrl);
            if (!li) {
              window.alert("Enter a valid LinkedIn profile URL.");
              return;
            }
            cancelPending();
            setSaving(true);
            try {
              const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  bio: bio.trim(),
                  linkedinUrl: li,
                  whatsappUrl: wa,
                  portfolioUrl: portfolioUrl.trim() || null,
                  mentorCertifications: mentorCertifications.trim() || null,
                }),
              });
              if (!res.ok) {
                window.alert("Could not save. Try signing in again.");
                setSaving(false);
                return;
              }
              router.push("/mentor/availability");
            } catch {
              window.alert("Network error. Check your connection and try again.");
              setSaving(false);
            }
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="bio" className={setupLabel}>
              Professional bio
              <span className={setupRequiredStar} title="Required" aria-hidden>
                *
              </span>
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="whatsappUrl" className={setupLabel}>
                WhatsApp number
                <span className={setupRequiredStar} title="Required" aria-hidden>
                  *
                </span>
              </label>
              <input
                id="whatsappUrl"
                name="whatsappUrl"
                type="text"
                required
                value={whatsappUrl}
                onChange={(e) => {
                  const v = e.target.value;
                  setWhatsappUrl(v);
                  const t = v.trim();
                  if (!t) {
                    scheduleSave({ whatsappUrl: null });
                    return;
                  }
                  const n = normalizeWhatsappUrl(v);
                  if (n) scheduleSave({ whatsappUrl: n });
                }}
                placeholder="Country code + number, e.g. 91 98765 43210, or paste https://wa.me/…"
                className={setupField}
                autoComplete="tel"
              />
              <p className="text-[11px] leading-snug text-[#9ca3af]">
                We store a WhatsApp chat link. Include your country code if you type digits only.
              </p>
            </div>
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="linkedinUrl" className={setupLabel}>
                LinkedIn profile
                <span className={setupRequiredStar} title="Required" aria-hidden>
                  *
                </span>
              </label>
              <input
                id="linkedinUrl"
                name="linkedinUrl"
                type="url"
                required
                value={linkedinUrl}
                onChange={(e) => {
                  const v = e.target.value;
                  setLinkedinUrl(v);
                  const t = v.trim();
                  if (!t) {
                    scheduleSave({ linkedinUrl: null });
                    return;
                  }
                  const n = normalizeLinkedInUrl(v);
                  if (n) scheduleSave({ linkedinUrl: n });
                }}
                placeholder="https://linkedin.com/in/yourprofile"
                className={setupField}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch md:gap-5">
            <div className="flex min-w-0 flex-col gap-4">
              <div className="space-y-1.5">
                <label htmlFor="portfolioUrl" className={setupLabel}>
                  Portfolio — website or project link{" "}
                  <span className="font-normal text-[#9ca3af]">(optional)</span>
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
                <label htmlFor="mentorCertifications" className={setupLabel}>
                  Certifications &amp; credentials{" "}
                  <span className="font-normal text-[#9ca3af]">(optional)</span>
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
            </div>
            <div className="flex h-full min-h-0 min-w-0 flex-col gap-1.5">
              <span id="mentor-setup-portfolio-file-label" className={setupLabel}>
                Portfolio — upload PDF or ZIP{" "}
                <span className="font-normal text-[#9ca3af]">(optional)</span>
              </span>
              <input
                ref={portfolioFileRef}
                type="file"
                accept=".pdf,.zip,application/pdf,application/zip,application/x-zip-compressed"
                className="hidden"
                aria-labelledby="mentor-setup-portfolio-file-label"
                onChange={onPortfolioFile}
              />
              <button
                type="button"
                onClick={() => portfolioFileRef.current?.click()}
                className="flex min-h-[11rem] w-full flex-1 flex-col items-center justify-center rounded-md border border-dashed border-black/15 bg-white px-3 py-5 text-center transition-colors hover:border-primary/35 hover:bg-orange-50/40 md:min-h-0"
              >
                <IconUpload className="mb-1.5 size-7 text-[#717182]" />
                <span className="text-[13px] font-medium text-[#0a0a0a]">Upload a portfolio file</span>
                <span className="mt-0.5 text-[11px] text-[#9ca3af]">PDF or ZIP · max 10 MB</span>
              </button>
              {portfolioFileLabel ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-black/10 bg-neutral-50/90 px-2.5 py-2 text-[13px]">
                  <span className="min-w-0 flex-1 truncate text-[#0a0a0a]" title={portfolioFileLabel}>
                    {portfolioFileLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => void clearPortfolioFile()}
                    className="shrink-0 text-[12px] font-medium text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <button type="button" onClick={() => router.push("/mentor/setup/2")} className={btnGhost}>
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
                  Next: Set Availability
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

function IconUpload({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 16V4m0 0l4 4m-4-4L8 8M4 20h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={`${className ?? ""} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
