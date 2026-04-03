"use client";

import { useRouter } from "next/navigation";

import { StudentSetupShell } from "./StudentSetupShell";
import { setupField, setupLabel } from "./student-ui";

const years = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduate"];

const btnPrimary =
  "mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 sm:text-sm";

export function StudentSetupStep1() {
  const router = useRouter();

  return (
    <StudentSetupShell step={1} backHref="/auth/register/student">
      <section>
        <h2 className="mb-3 text-base font-semibold text-[#0a0a0a]">Academic Information</h2>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const res = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                role: "student",
                university: String(fd.get("university") ?? "").trim() || null,
                yearOfStudy: String(fd.get("year") ?? "").trim() || null,
                major: String(fd.get("major") ?? "").trim() || null,
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
              University / College
            </label>
            <input
              id="university"
              name="university"
              type="text"
              placeholder="e.g., MIT, Stanford University"
              className={setupField}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="year" className={setupLabel}>
              Year of Study
            </label>
            <div className="relative">
              <select
                id="year"
                name="year"
                defaultValue=""
                className={`${setupField} appearance-none pr-9`}
                required
              >
                <option value="" disabled>
                  Select year
                </option>
                {years.map((y) => (
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
            <label htmlFor="major" className={setupLabel}>
              Major / Program
            </label>
            <input
              id="major"
              name="major"
              type="text"
              placeholder="e.g., Architecture, Civil Engineering"
              className={setupField}
            />
          </div>
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
