"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PROGRAM_OPTIONS, PROGRAM_OTHER_VALUE, YEAR_OPTIONS } from "./student-setup-constants";
import { StudentSetupShell } from "./StudentSetupShell";
import { setupField, setupLabel, setupRequiredStar } from "./student-ui";
import { SetupGoogleCalendarConnect } from "@/components/setup/SetupGoogleCalendarConnect";
import { SetupLinkedInNotice } from "@/components/setup/SetupLinkedInNotice";
import { useProfileAutosave } from "@/hooks/useProfileAutosave";
import type { StudentSetupUserSnapshot } from "@/lib/setup-load-user";

const btnPrimary =
  "mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 sm:text-sm";

function programStateFromMajor(major: string | null | undefined): {
  program: string;
  majorOther: string;
} {
  if (!major?.trim()) return { program: "", majorOther: "" };
  if ((PROGRAM_OPTIONS as readonly string[]).includes(major)) {
    return { program: major, majorOther: "" };
  }
  return { program: PROGRAM_OTHER_VALUE, majorOther: major };
}

export function StudentSetupStep1({
  initial,
  linkedInConnected,
  googleCalendarConnected = false,
}: {
  initial?: StudentSetupUserSnapshot;
  linkedInConnected?: boolean;
  googleCalendarConnected?: boolean;
}) {
  const router = useRouter();
  const scheduleSave = useProfileAutosave();

  const { program: p0, majorOther: mo0 } = useMemo(
    () => programStateFromMajor(initial?.major ?? null),
    [initial?.major],
  );

  const [university, setUniversity] = useState(initial?.university ?? "");
  const [year, setYear] = useState(initial?.yearOfStudy ?? "");
  const [program, setProgram] = useState(p0);
  const [majorOther, setMajorOther] = useState(mo0);
  const [phone, setPhone] = useState(initial?.phone ?? "");

  return (
    <StudentSetupShell step={1} backHref="/auth/register/student">
      <section>
        {linkedInConnected ? <SetupLinkedInNotice variant="student" /> : null}
        <h2 className="mb-1 text-base font-semibold text-[#0a0a0a]">
          Academic information
          <span className={setupRequiredStar} title="Required" aria-hidden>
            *
          </span>
        </h2>
        <p className="mb-1 text-[12px] leading-snug text-[#6b7280]">
          University, year, program, and phone are required.
        </p>
        <p className="mb-3 text-[12px] text-[#6b7280]">Changes save automatically.</p>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!university.trim()) {
              window.alert("Please enter your university or college.");
              return;
            }
            if (!phone.trim()) {
              window.alert("Please enter your phone number.");
              return;
            }
            let major: string | null = null;
            if (program === PROGRAM_OTHER_VALUE) {
              major = majorOther.trim() || null;
              if (!major) {
                window.alert("Please specify your program.");
                return;
              }
            } else if (program) {
              major = program;
            } else {
              window.alert("Please select your major / program.");
              return;
            }
            const res = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                role: "student",
                university: university.trim() || null,
                yearOfStudy: year.trim() || null,
                major,
                phone: phone.trim() || null,
              }),
            });
            if (!res.ok) {
              window.alert("Could not save your profile. Try signing in again.");
              return;
            }
            router.push("/student/setup/2");
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="university" className={setupLabel}>
              University / College <span className="text-primary">*</span>
            </label>
            <input
              id="university"
              name="university"
              type="text"
              value={university}
              onChange={(e) => {
                const v = e.target.value;
                setUniversity(v);
                scheduleSave({ role: "student", university: v.trim() || null });
              }}
              placeholder="e.g., MIT, Stanford University"
              className={setupField}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="year" className={setupLabel}>
              Year of Study <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <select
                id="year"
                name="year"
                value={year}
                onChange={(e) => {
                  const v = e.target.value;
                  setYear(v);
                  scheduleSave({ role: "student", yearOfStudy: v.trim() || null });
                }}
                className={`${setupField} appearance-none pr-9`}
                required
              >
                <option value="" disabled>
                  Select year
                </option>
                {YEAR_OPTIONS.map((y) => (
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
          <div className="space-y-1.5">
            <label htmlFor="program" className={setupLabel}>
              Major / Program <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <select
                id="program"
                value={program}
                onChange={(e) => {
                  const v = e.target.value;
                  setProgram(v);
                  let major: string | null = null;
                  if (v === PROGRAM_OTHER_VALUE) major = majorOther.trim() || null;
                  else if (v) major = v;
                  scheduleSave({ role: "student", major });
                }}
                className={`${setupField} appearance-none pr-9`}
                required
              >
                <option value="" disabled>
                  Select program
                </option>
                {PROGRAM_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value={PROGRAM_OTHER_VALUE}>Other</option>
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#717182]">
                <ChevronDown />
              </span>
            </div>
            {program === PROGRAM_OTHER_VALUE && (
              <input
                id="majorOther"
                name="majorOther"
                type="text"
                value={majorOther}
                onChange={(e) => {
                  const v = e.target.value;
                  setMajorOther(v);
                  scheduleSave({ role: "student", major: v.trim() || null });
                }}
                placeholder="Specify your program"
                className={setupField}
                required
                autoComplete="off"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="phone" className={setupLabel}>
              Phone number <span className="text-primary">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                const v = e.target.value;
                setPhone(v);
                scheduleSave({ role: "student", phone: v.trim() || null });
              }}
              placeholder="Include country code if applicable"
              className={setupField}
              autoComplete="tel"
              required
            />
          </div>

          <SetupGoogleCalendarConnect
            connected={googleCalendarConnected}
            returnPath="/student/setup/1"
            required
            description="Required before you can finish profile setup (step 3). Connect now or on the last step. If you signed in with Google, this may already show as connected."
          />

          <button type="submit" className={btnPrimary}>
            Next: Interests &amp; Skills
            <ArrowRight className="size-3.5" />
          </button>
        </form>
      </section>
    </StudentSetupShell>
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
