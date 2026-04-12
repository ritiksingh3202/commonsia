"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  INTEREST_OTHERS_LABEL,
  SOFTWARE_OPTIONS,
  SOFTWARE_OTHER_LABEL,
} from "./student-setup-constants";
import {
  ArchitectureGroupedPills,
  architectureOthersSectionRule,
  architectureOthersSectionTitle,
  architecturePillBase,
} from "@/components/shared/ArchitectureGroupedPills";
import { interestStateFromServer, interestsPayloadFromSelection } from "@/components/student/student-interest-sync";
import { StudentSetupShell } from "./StudentSetupShell";
import { setupField, setupLabel, setupRequiredStar } from "./student-ui";
import { SetupLinkedInNotice } from "@/components/setup/SetupLinkedInNotice";
import { useProfileAutosave } from "@/hooks/useProfileAutosave";
import { interestsToStringList, type StudentSetupUserSnapshot } from "@/lib/setup-load-user";

const btnGhost =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md border border-black/10 bg-white py-2.5 text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-neutral-50 sm:text-sm";

const btnPrimary =
  "flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 sm:text-sm";

const chipOn = "border-primary bg-primary/5 text-[#0a0a0a] ring-1 ring-primary/25";
const chipOff = "border-[#e5e7eb] bg-white text-[#0a0a0a] hover:border-neutral-300";

function parseSoftwareFromSaved(raw: string | null | undefined): {
  selected: Set<string>;
  otherDetail: string;
} {
  const selected = new Set<string>();
  let otherDetail = "";
  if (!raw?.trim()) return { selected, otherDetail };
  const parts = raw.split(/\s*,\s*/).map((p) => p.trim());
  for (const p of parts) {
    if (!p) continue;
    if (p.startsWith("Other:")) {
      selected.add(SOFTWARE_OTHER_LABEL);
      otherDetail = p.slice(6).trim();
    } else if ((SOFTWARE_OPTIONS as readonly string[]).includes(p)) {
      selected.add(p);
    } else if (p === SOFTWARE_OTHER_LABEL) {
      selected.add(SOFTWARE_OTHER_LABEL);
    } else {
      selected.add(SOFTWARE_OTHER_LABEL);
      otherDetail = otherDetail ? `${otherDetail}; ${p}` : p;
    }
  }
  return { selected, otherDetail };
}

export function StudentSetupStep2({
  initial,
  linkedInConnected,
}: {
  initial?: StudentSetupUserSnapshot;
  linkedInConnected?: boolean;
}) {
  const router = useRouter();
  const scheduleSave = useProfileAutosave();

  const interestDerived = useMemo(
    () =>
      interestStateFromServer(
        interestsToStringList(initial?.interests),
        initial?.otherInterests,
      ),
    [initial?.interests, initial?.otherInterests],
  );

  const { selected: softwareInit, otherDetail: softwareOtherInit } = useMemo(
    () => parseSoftwareFromSaved(initial?.softwareSkills ?? null),
    [initial?.softwareSkills],
  );

  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(() => new Set(interestDerived.sel));
  const [selectedSoftware, setSelectedSoftware] = useState<Set<string>>(() => new Set(softwareInit));
  const [othersDetail, setOthersDetail] = useState(interestDerived.others);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync local selections when saved interests snapshot changes */
    setSelectedInterests(new Set(interestDerived.sel));
    setOthersDetail(interestDerived.others);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [interestDerived]);
  const [softwareOtherDetail, setSoftwareOtherDetail] = useState(softwareOtherInit);

  const persistInterests = (next: Set<string>, othersText: string) => {
    const { interests, otherInterests } = interestsPayloadFromSelection(next, othersText);
    scheduleSave({ interests, otherInterests });
  };

  const persistSoftware = (next: Set<string>, otherSoft: string) => {
    const softwareParts: string[] = [];
    for (const name of SOFTWARE_OPTIONS) {
      if (next.has(name)) softwareParts.push(name);
    }
    if (next.has(SOFTWARE_OTHER_LABEL)) {
      const extra = otherSoft.trim();
      if (extra) softwareParts.push(`Other: ${extra}`);
      else softwareParts.push(SOFTWARE_OTHER_LABEL);
    }
    scheduleSave({
      softwareSkills: softwareParts.length ? softwareParts.join(", ") : null,
    });
  };

  function toggleInterest(id: string) {
    const next = new Set(selectedInterests);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedInterests(next);
    const od = next.has(INTEREST_OTHERS_LABEL) ? othersDetail : "";
    persistInterests(next, od);
  }

  function toggleSoftware(id: string) {
    const next = new Set(selectedSoftware);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSoftware(next);
    persistSoftware(next, softwareOtherDetail);
  }

  return (
    <StudentSetupShell step={2} backHref="/student/setup/1">
      <section>
        {linkedInConnected ? <SetupLinkedInNotice variant="student" /> : null}
        <h2 className="mb-1 text-base font-semibold text-[#0a0a0a]">
          Interests &amp; skills
          <span className={setupRequiredStar} title="Required" aria-hidden>
            *
          </span>
        </h2>
        <p className="mb-1 text-[12px] leading-snug text-[#6b7280]">
          Choose your architecture interests and software skills. Select all that apply where relevant.
        </p>
        <p className="mb-4 text-[12px] text-[#6b7280]">Changes save automatically.</p>
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();

            const { interests, otherInterests } = interestsPayloadFromSelection(
              selectedInterests,
              othersDetail,
            );
            if (selectedInterests.has(INTEREST_OTHERS_LABEL) && !othersDetail.trim()) {
              window.alert('Please describe your interests under "Others".');
              return;
            }
            if (!interests?.length) {
              window.alert("Please select at least one interest.");
              return;
            }

            if (selectedSoftware.size === 0) {
              window.alert("Please select at least one software skill.");
              return;
            }
            if (selectedSoftware.has(SOFTWARE_OTHER_LABEL) && !softwareOtherDetail.trim()) {
              window.alert('Please name the software you use under "Other".');
              return;
            }

            const softwareParts: string[] = [];
            for (const name of SOFTWARE_OPTIONS) {
              if (selectedSoftware.has(name)) softwareParts.push(name);
            }
            if (selectedSoftware.has(SOFTWARE_OTHER_LABEL)) {
              const extra = softwareOtherDetail.trim();
              softwareParts.push(extra ? `Other: ${extra}` : SOFTWARE_OTHER_LABEL);
            }

            const res = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                interests,
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
            <p className={`mb-2 ${setupLabel}`}>
              Interests in Architecture <span className="text-primary">*</span>
            </p>
            <p className="mb-2 text-[12px] leading-snug text-[#6b7280]">
              Select all that apply. Use <span className="font-medium">Others</span> for additional interests (required
              detail if selected).
            </p>
            <ArchitectureGroupedPills
              selected={selectedInterests}
              onToggle={toggleInterest}
              classNameOn={chipOn}
              classNameOff="border-[#e5e7eb] bg-white text-neutral-700 hover:border-neutral-300"
            />
            <div className="mb-2">
              <h3 className={architectureOthersSectionTitle}>{INTEREST_OTHERS_LABEL}</h3>
              <div className={architectureOthersSectionRule} aria-hidden />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => toggleInterest(INTEREST_OTHERS_LABEL)}
                  className={`${architecturePillBase} ${
                    selectedInterests.has(INTEREST_OTHERS_LABEL)
                      ? chipOn
                      : "border-[#e5e7eb] bg-white text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  {INTEREST_OTHERS_LABEL}
                </button>
              </div>
              {selectedInterests.has(INTEREST_OTHERS_LABEL) && (
                <div className="mt-4 space-y-1.5">
                  <label htmlFor="othersDetail" className={setupLabel}>
                    Describe your other interests <span className="text-primary">*</span>
                  </label>
                  <textarea
                    id="othersDetail"
                    name="othersDetail"
                    rows={3}
                    value={othersDetail}
                    onChange={(e) => {
                      const v = e.target.value;
                      setOthersDetail(v);
                      persistInterests(selectedInterests, v);
                    }}
                    placeholder="Write what other areas of architecture you are interested in..."
                    className={`${setupField} min-h-[80px] resize-y`}
                    required
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <p className={`mb-2 ${setupLabel}`}>
              Software skills <span className="text-primary">*</span>
            </p>
            <p className="mb-2 text-[12px] leading-snug text-[#6b7280]">
              Select at least one. If you choose <span className="font-medium">Other</span>, name the tool(s) in the
              field below.
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
                  Other software <span className="text-primary">*</span>
                </label>
                <input
                  id="softwareOtherDetail"
                  name="softwareOtherDetail"
                  type="text"
                  value={softwareOtherDetail}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSoftwareOtherDetail(v);
                    persistSoftware(selectedSoftware, v);
                  }}
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
