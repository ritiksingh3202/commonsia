"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { StudentSetupShell } from "./StudentSetupShell";
import { setupField, setupLabel } from "./student-ui";

const INTERESTS = [
  "Residential Design",
  "Commercial Architecture",
  "Sustainable Design",
  "Urban Planning",
  "Interior Architecture",
  "Landscape Architecture",
  "Historic Preservation",
  "Digital Fabrication",
] as const;

const btnGhost =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md border border-black/10 bg-white py-2.5 text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-neutral-50 sm:text-sm";

const btnPrimary =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 sm:text-sm";

export function StudentSetupStep2() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
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
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const res = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                interests: Array.from(selected),
                softwareSkills: String(fd.get("software") ?? "").trim() || null,
                otherInterests: String(fd.get("other") ?? "").trim() || null,
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {INTERESTS.map((label) => {
                const isOn = selected.has(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggle(label)}
                    className={`rounded-lg border py-2.5 text-center text-[13px] font-medium transition-colors ${
                      isOn
                        ? "border-primary bg-primary/5 text-[#0a0a0a]"
                        : "border-[#e5e7eb] bg-white text-[#0a0a0a] hover:border-neutral-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="software" className={setupLabel}>
              Software Skills
            </label>
            <input
              id="software"
              name="software"
              type="text"
              placeholder="e.g., AutoCAD, Revit, SketchUp, Rhino, Adobe Suite"
              className={setupField}
            />
            <p className="text-[11px] leading-snug text-[#6a7282] sm:text-xs">
              List software you&apos;re familiar with, separated by commas
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="other" className={setupLabel}>
              Other Interests (Optional)
            </label>
            <textarea
              id="other"
              name="other"
              rows={4}
              placeholder="Any other areas you're interested in exploring..."
              className={`${setupField} min-h-[88px] resize-y`}
            />
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
