"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { COUNTRY_OPTIONS, citiesForCountry } from "@/lib/country-city-options";
import { SetupLinkedInNotice } from "@/components/setup/SetupLinkedInNotice";
import {
  MENTOR_EXPERTISE_OTHER,
  MENTOR_YEARS_OPTIONS,
  normalizeMentorYearsBand,
} from "@/components/mentor/mentor-setup-constants";
import {
  mentorExpertiseListFromSelection,
  mentorExpertiseStateFromServer,
} from "@/components/shared/architecture-taxonomy";
import {
  ArchitectureGroupedPills,
  architectureOthersSectionRule,
  architectureOthersSectionTitle,
  architecturePillBase,
} from "@/components/shared/ArchitectureGroupedPills";
import { MentorSetupShell } from "@/components/mentor/MentorSetupShell";
import { setupField, setupLabel, setupRequiredStar } from "@/components/student/student-ui";
import { useProfileAutosave } from "@/hooks/useProfileAutosave";
import { expertiseToStringList, type MentorSetupUserSnapshot } from "@/lib/setup-load-user";

const btnPrimary =
  "mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 sm:text-sm";

const chipOn = "border-primary bg-primary/5 text-[#0a0a0a] ring-1 ring-primary/25";
const chipOff = "border-[#e5e7eb] bg-white text-[#0a0a0a] hover:border-neutral-300";

function expertiseFromSnapshot(raw: MentorSetupUserSnapshot["mentorExpertise"] | undefined) {
  const saved = expertiseToStringList(raw ?? null);
  return mentorExpertiseStateFromServer(saved, MENTOR_EXPERTISE_OTHER);
}

export function MentorSetupStep1({
  initial,
  linkedInConnected,
}: {
  initial?: MentorSetupUserSnapshot;
  linkedInConnected?: boolean;
}) {
  const router = useRouter();
  const { schedule: scheduleSave, flushNow } = useProfileAutosave();

  const expertiseDerived = useMemo(
    () => expertiseFromSnapshot(initial?.mentorExpertise),
    [initial?.mentorExpertise],
  );

  const [country, setCountry] = useState(initial?.country ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [title, setTitle] = useState(initial?.mentorTitle ?? "");
  const [company, setCompany] = useState(initial?.mentorCompany ?? "");
  const [years, setYears] = useState(() => normalizeMentorYearsBand(initial?.mentorYearsExperience ?? ""));
  const [expertise, setExpertise] = useState<Set<string>>(() => new Set(expertiseDerived.sel));
  const [otherExpertise, setOtherExpertise] = useState(expertiseDerived.other);

  const cityOptions = useMemo(() => (country ? citiesForCountry(country) : []), [country]);

  useEffect(() => {
    if (!country) return;
    if (city && !cityOptions.includes(city)) {
      setCity("");
    }
  }, [country, city, cityOptions]);

  useEffect(() => {
    const d = expertiseFromSnapshot(initial?.mentorExpertise);
    /* eslint-disable react-hooks/set-state-in-effect -- reset local form when saved mentor snapshot changes */
    setExpertise(new Set(d.sel));
    setOtherExpertise(d.other);
    setYears(normalizeMentorYearsBand(initial?.mentorYearsExperience ?? ""));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initial?.mentorExpertise, initial?.mentorYearsExperience]);

  const toggleExpertise = (opt: string) => {
    const next = new Set(expertise);
    if (next.has(opt)) next.delete(opt);
    else next.add(opt);
    setExpertise(next);
    scheduleSave({
      role: "mentor",
      mentorExpertise: mentorExpertiseListFromSelection(next, otherExpertise, MENTOR_EXPERTISE_OTHER),
    });
  };

  return (
    <MentorSetupShell step={1} backHref="/auth/register/mentor">
      <section>
        {linkedInConnected ? <SetupLinkedInNotice variant="mentor" /> : null}
        <h2 className="mb-1 text-base font-semibold text-[#0a0a0a]">
          Professional information
          <span className={setupRequiredStar} title="Required" aria-hidden>
            *
          </span>
        </h2>
        <p className="mb-3 text-[12px] leading-snug text-[#6b7280]">
          Country, city, role, organization, experience, and areas of expertise are required (expertise counts as one
          section). Changes save automatically.
        </p>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!country.trim()) {
              window.alert("Please select your country.");
              return;
            }
            if (!city.trim()) {
              window.alert("Please select your city.");
              return;
            }
            if (!title.trim() || !company.trim() || !years.trim()) {
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
            const expertiseList = mentorExpertiseListFromSelection(
              expertise,
              otherExpertise,
              MENTOR_EXPERTISE_OTHER,
            );
            await flushNow();
            const res = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                role: "mentor",
                country: country.trim() || null,
                city: city.trim() || null,
                mentorTitle: title.trim(),
                mentorCompany: company.trim(),
                mentorYearsExperience: years.trim(),
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="mentorCountry" className={setupLabel}>
                Country <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <select
                  id="mentorCountry"
                  name="country"
                  value={country}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCountry(v);
                    setCity("");
                    scheduleSave({ role: "mentor", country: v.trim() || null, city: null });
                  }}
                  className={`${setupField} appearance-none pr-9`}
                  required
                >
                  <option value="" disabled>
                    Select country
                  </option>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#717182]">
                  <ChevronDown />
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="mentorCity" className={setupLabel}>
                City <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <select
                  id="mentorCity"
                  name="city"
                  value={city}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCity(v);
                    scheduleSave({ role: "mentor", city: v.trim() || null });
                  }}
                  className={`${setupField} appearance-none pr-9`}
                  required
                  disabled={!country}
                >
                  <option value="" disabled>
                    {country ? "Select city" : "Select country first"}
                  </option>
                  {cityOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#717182]">
                  <ChevronDown />
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="mentorTitle" className={setupLabel}>
                Current Position / Title
              </label>
              <input
                id="mentorTitle"
                name="mentorTitle"
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  scheduleSave({ role: "mentor", mentorTitle: e.target.value.trim() || null });
                }}
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
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value);
                  scheduleSave({ role: "mentor", mentorCompany: e.target.value.trim() || null });
                }}
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
                  value={years}
                  onChange={(e) => {
                    const v = e.target.value;
                    setYears(v);
                    scheduleSave({ role: "mentor", mentorYearsExperience: v.trim() || null });
                  }}
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
          </div>

          <div className="space-y-2 pt-1">
            <p className={setupLabel}>
              Areas of expertise
              <span className={setupRequiredStar} title="Required" aria-hidden>
                *
              </span>
            </p>
            <p className="text-[12px] text-[#9ca3af]">Select all that apply — one or more, including Other if needed</p>
            <ArchitectureGroupedPills
              selected={expertise}
              onToggle={toggleExpertise}
              classNameOn={chipOn}
              classNameOff={chipOff}
            />
            <div>
              <h3 className={architectureOthersSectionTitle}>{MENTOR_EXPERTISE_OTHER}</h3>
              <div className={architectureOthersSectionRule} aria-hidden />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => toggleExpertise(MENTOR_EXPERTISE_OTHER)}
                  className={`${architecturePillBase} ${expertise.has(MENTOR_EXPERTISE_OTHER) ? chipOn : chipOff}`}
                >
                  {MENTOR_EXPERTISE_OTHER}
                </button>
              </div>
              {expertise.has(MENTOR_EXPERTISE_OTHER) ? (
                <div className="mt-4 space-y-1.5">
                  <label htmlFor="mentorExpertiseOther" className={setupLabel}>
                    Describe your other expertise
                    <span className={setupRequiredStar} title="Required" aria-hidden>
                      *
                    </span>
                  </label>
                  <input
                    id="mentorExpertiseOther"
                    name="mentorExpertiseOther"
                    type="text"
                    value={otherExpertise}
                    onChange={(e) => {
                      const v = e.target.value;
                      setOtherExpertise(v);
                      scheduleSave({
                        role: "mentor",
                        mentorExpertise: mentorExpertiseListFromSelection(
                          expertise,
                          v,
                          MENTOR_EXPERTISE_OTHER,
                        ),
                      });
                    }}
                    placeholder="e.g., Exhibition design, Computational design"
                    className={setupField}
                    autoComplete="off"
                  />
                </div>
              ) : null}
            </div>
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
