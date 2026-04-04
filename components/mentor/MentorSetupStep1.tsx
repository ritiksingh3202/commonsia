"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  MENTOR_EXPERTISE_OPTIONS,
  MENTOR_EXPERTISE_OTHER,
  MENTOR_YEARS_OPTIONS,
} from "@/components/mentor/mentor-setup-constants";
import { MentorSetupShell } from "@/components/mentor/MentorSetupShell";
import { setupField, setupLabel } from "@/components/student/student-ui";

const btnPrimary =
  "mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 sm:text-sm";

const chipOn = "border-primary bg-primary/5 text-[#0a0a0a] ring-1 ring-primary/25";
const chipOff = "border-[#e5e7eb] bg-white text-[#0a0a0a] hover:border-neutral-300";

export function MentorSetupStep1() {
  const router = useRouter();
  const [expertise, setExpertise] = useState<Set<string>>(new Set());
  const [otherExpertise, setOtherExpertise] = useState("");

  const toggle = (label: string) => {
    setExpertise((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <MentorSetupShell step={1} backHref="/auth/register/mentor">
      <section>
        <h2 className="mb-3 text-base font-semibold text-[#0a0a0a]">Professional Information</h2>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const title = String(fd.get("mentorTitle") ?? "").trim();
            const company = String(fd.get("mentorCompany") ?? "").trim();
            const years = String(fd.get("mentorYears") ?? "").trim();
            if (!title || !company || !years) {
              window.alert("Please fill in your position, organization, and years of experience.");
              return;
            }
            if (expertise.size === 0) {
              window.alert("Select at least one area of expertise.");
              return;
            }
            if (expertise.has(MENTOR_EXPERTISE_OTHER) && !otherExpertise.trim()) {
              window.alert('Please describe your area under "Other".');
              return;
            }
            const expertiseList: string[] = [];
            for (const label of expertise) {
              if (label === MENTOR_EXPERTISE_OTHER) {
                expertiseList.push(otherExpertise.trim());
              } else {
                expertiseList.push(label);
              }
            }
            const res = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                role: "mentor",
                mentorTitle: title,
                mentorCompany: company,
                mentorYearsExperience: years,
                mentorExpertise: expertiseList,
              }),
            });
            if (!res.ok) {
              window.alert("Could not save your profile. Try signing in again.");
              return;
            }
            router.push("/mentor/setup/2");
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="mentorTitle" className={setupLabel}>
              Current Position / Title
            </label>
            <input
              id="mentorTitle"
              name="mentorTitle"
              type="text"
              required
              placeholder="e.g., Senior Architect, Design Director"
              className={setupField}
              autoComplete="organization-title"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="mentorCompany" className={setupLabel}>
              Company / Organization
            </label>
            <input
              id="mentorCompany"
              name="mentorCompany"
              type="text"
              required
              placeholder="e.g., ABC Architects, XYZ Design Studio"
              className={setupField}
              autoComplete="organization"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="mentorYears" className={setupLabel}>
              Years of Experience
            </label>
            <div className="relative">
              <select
                id="mentorYears"
                name="mentorYears"
                defaultValue=""
                className={`${setupField} appearance-none pr-9`}
                required
              >
                <option value="" disabled>
                  Select experience level
                </option>
                {MENTOR_YEARS_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#717182]">
                <ChevronDown />
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <p className={setupLabel}>Areas of Expertise</p>
            <div className="grid grid-cols-2 gap-2">
              {MENTOR_EXPERTISE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className={`rounded-xl border py-2.5 text-center text-[12px] font-medium leading-snug transition sm:text-[13px] ${
                    expertise.has(opt) ? chipOn : chipOff
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {expertise.has(MENTOR_EXPERTISE_OTHER) ? (
              <div className="space-y-1.5">
                <label htmlFor="mentorExpertiseOther" className={setupLabel}>
                  Describe your other expertise
                </label>
                <input
                  id="mentorExpertiseOther"
                  name="mentorExpertiseOther"
                  type="text"
                  value={otherExpertise}
                  onChange={(e) => setOtherExpertise(e.target.value)}
                  placeholder="e.g., Exhibition design, Computational design"
                  className={setupField}
                  autoComplete="off"
                />
              </div>
            ) : null}
            <p className="text-[12px] text-[#9ca3af]">Select all that apply</p>
          </div>

          <button type="submit" className={btnPrimary}>
            Next: Mentorship Details
            <ArrowRight className="size-3.5" />
          </button>
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
