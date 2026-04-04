"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  INTEREST_OPTIONS,
  INTEREST_OTHERS_LABEL,
  SOFTWARE_OPTIONS,
  SOFTWARE_OTHER_LABEL,
} from "./student-setup-constants";
import { StudentSetupShell } from "./StudentSetupShell";
import { setupField, setupLabel } from "./student-ui";

const btnGhost =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md border border-black/10 bg-white py-2.5 text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-neutral-50 sm:text-sm";

const btnPrimary =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 sm:text-sm";

const chipOn = "border-primary bg-primary/5 text-[#0a0a0a] ring-1 ring-primary/25";
const chipOff = "border-[#e5e7eb] bg-white text-[#0a0a0a] hover:border-neutral-300";

export function StudentSetupStep2() {
  const router = useRouter();
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set());
  const [selectedSoftware, setSelectedSoftware] = useState<Set<string>>(new Set());

  function toggleInterest(id: string) {
    setSelectedInterests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSoftware(id: string) {
    setSelectedSoftware((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <StudentSetupShell step={2} backHref="/student/setup/1">
      <section>
        <h2 className="mb-3 text-base font-semibold text-[#0a0a0a]">Interests &amp; Skills</h2>
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);

            const interestsList: string[] = [];
            for (const label of INTEREST_OPTIONS) {
              if (selectedInterests.has(label)) interestsList.push(label);
            }
            let otherInterests: string | null = null;
            if (selectedInterests.has(INTEREST_OTHERS_LABEL)) {
              const detail = String(fd.get("othersDetail") ?? "").trim();
              if (!detail) {
                window.alert('Please describe your interests under "Others".');
                return;
              }
              interestsList.push(INTEREST_OTHERS_LABEL);
              otherInterests = detail;
            }

            const softwareParts: string[] = [];
            for (const name of SOFTWARE_OPTIONS) {
              if (selectedSoftware.has(name)) softwareParts.push(name);
            }
            if (selectedSoftware.has(SOFTWARE_OTHER_LABEL)) {
              const extra = String(fd.get("softwareOtherDetail") ?? "").trim();
              if (extra) {
                softwareParts.push(`Other: ${extra}`);
              } else {
                softwareParts.push(SOFTWARE_OTHER_LABEL);
              }
            }

            const res = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                interests: interestsList.length ? interestsList : null,
                softwareSkills: softwareParts.length ? softwareParts.join(", ") : null,
                otherInterests,
              }),
            });
            if (!res.ok) {
              window.alert("Could not save your profile. Try signing in again.");
              return;
            }
            router.push("/student/setup/3");
          }}
        >
          <div>
            <p className={`mb-2 ${setupLabel}`}>Interests in Architecture</p>
            <p className="mb-2 text-[12px] leading-snug text-[#6b7280]">
              Select any that apply (8 options). Choose <span className="font-medium">Others</span> to
              describe additional interests.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {INTEREST_OPTIONS.map((label) => {
                const isOn = selectedInterests.has(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleInterest(label)}
                    className={`rounded-lg border py-2.5 text-center text-[13px] font-medium transition-colors ${
                      isOn ? chipOn : chipOff
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => toggleInterest(INTEREST_OTHERS_LABEL)}
                className={`rounded-lg border py-2.5 text-center text-[13px] font-medium transition-colors ${
                  selectedInterests.has(INTEREST_OTHERS_LABEL) ? chipOn : chipOff
                }`}
              >
                {INTEREST_OTHERS_LABEL}
              </button>
            </div>
            {selectedInterests.has(INTEREST_OTHERS_LABEL) && (
              <div className="mt-3 space-y-1.5">
                <label htmlFor="othersDetail" className={setupLabel}>
                  Describe your other interests
                </label>
                <textarea
                  id="othersDetail"
                  name="othersDetail"
                  rows={3}
                  placeholder="Write what other areas of architecture you are interested in..."
                  className={`${setupField} min-h-[80px] resize-y`}
                  required
                />
              </div>
            )}
          </div>

          <div>
            <p className={`mb-2 ${setupLabel}`}>Software skills</p>
            <p className="mb-2 text-[12px] leading-snug text-[#6b7280]">
              Select tools you use. Add details under <span className="font-medium">Other</span> if needed.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SOFTWARE_OPTIONS.map((label) => {
                const isOn = selectedSoftware.has(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleSoftware(label)}
                    className={`rounded-lg border py-2.5 text-center text-[13px] font-medium transition-colors ${
                      isOn ? chipOn : chipOff
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => toggleSoftware(SOFTWARE_OTHER_LABEL)}
                className={`rounded-lg border py-2.5 text-center text-[13px] font-medium transition-colors ${
                  selectedSoftware.has(SOFTWARE_OTHER_LABEL) ? chipOn : chipOff
                }`}
              >
                {SOFTWARE_OTHER_LABEL}
              </button>
            </div>
            {selectedSoftware.has(SOFTWARE_OTHER_LABEL) && (
              <div className="mt-3 space-y-1.5">
                <label htmlFor="softwareOtherDetail" className={setupLabel}>
                  Other software (optional detail)
                </label>
                <input
                  id="softwareOtherDetail"
                  name="softwareOtherDetail"
                  type="text"
                  placeholder="e.g., Grasshopper, Dynamo, custom plugins..."
                  className={setupField}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
            <button type="button" onClick={() => router.push("/student/setup/1")} className={btnGhost}>
              <ArrowLeft className="size-3.5" />
              Previous
            </button>
            <button type="submit" className={btnPrimary}>
              Next: Portfolio
              <ArrowRight className="size-3.5" />
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
