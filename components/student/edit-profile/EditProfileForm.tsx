"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { compressImageToDataUrl } from "@/lib/resize-image-client";
import {
  INTEREST_OTHERS_LABEL,
  PROGRAM_OPTIONS,
  PROGRAM_OTHER_VALUE,
  SOFTWARE_OPTIONS,
  SOFTWARE_OTHER_LABEL,
  YEAR_OPTIONS,
} from "@/components/student/student-setup-constants";
import { parseInterests } from "@/components/student/student-profile-types";
import {
  ArchitectureGroupedPills,
  architectureOthersSectionRule,
  architectureOthersSectionTitle,
  architecturePillBase,
} from "@/components/shared/ArchitectureGroupedPills";
import { interestStateFromServer, interestsPayloadFromSelection } from "@/components/student/student-interest-sync";

const TABS = [
  { id: "personal", label: "Personal Info" },
  { id: "academic", label: "Academic" },
  { id: "interests", label: "Interests & Skills" },
  { id: "portfolio", label: "Portfolio & Bio" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export type EditProfileUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  university: string | null;
  yearOfStudy: string | null;
  major: string | null;
  interests: unknown;
  otherInterests: string | null;
  softwareSkills: string | null;
  bio: string | null;
  portfolioUrl: string | null;
  portfolioFileName: string | null;
  portfolioVisibleToOthers: boolean;
  whatsappUrl: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
};

const field =
  "w-full rounded-lg border border-black/[0.1] bg-white px-3 py-2.5 text-[13px] text-[#0a0a0a] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
const label = "mb-1.5 block text-[13px] font-medium text-[#0a0a0a]";
const chipOn = "border-primary bg-primary/5 text-[#0a0a0a] ring-1 ring-primary/25";
const chipOff = "border-[#e5e7eb] bg-white text-[#0a0a0a] hover:border-neutral-300";

function programFromMajor(major: string | null): { program: string; majorOther: string } {
  if (!major?.trim()) return { program: "", majorOther: "" };
  const m = major.trim();
  if ((PROGRAM_OPTIONS as readonly string[]).includes(m)) return { program: m, majorOther: "" };
  return { program: PROGRAM_OTHER_VALUE, majorOther: m };
}

function initSoftwareSet(skills: string | null): { set: Set<string>; otherDetail: string } {
  const set = new Set<string>();
  let otherDetail = "";
  if (!skills?.trim()) return { set, otherDetail };
  for (const raw of skills.split(/[,，]/)) {
    const p = raw.trim();
    if (!p) continue;
    if (p.startsWith("Other:")) {
      set.add(SOFTWARE_OTHER_LABEL);
      otherDetail = p.slice(6).trim();
    } else if ((SOFTWARE_OPTIONS as readonly string[]).includes(p)) {
      set.add(p);
    } else if (p === SOFTWARE_OTHER_LABEL) {
      set.add(SOFTWARE_OTHER_LABEL);
    } else {
      set.add(SOFTWARE_OTHER_LABEL);
      otherDetail = otherDetail ? `${otherDetail}; ${p}` : p;
    }
  }
  return { set, otherDetail };
}

function payloadFromInitialUser(u: EditProfileUser): Record<string, unknown> {
  const prog = programFromMajor(u.major);
  let major: string | null = null;
  if (prog.program === PROGRAM_OTHER_VALUE) {
    major = prog.majorOther.trim() || null;
  } else if (prog.program) {
    major = prog.program;
  }

  const { sel: interestSel0, others: others0 } = interestStateFromServer(
    parseInterests(u.interests),
    u.otherInterests,
  );
  const ip = interestsPayloadFromSelection(interestSel0, others0);

  const sw = initSoftwareSet(u.softwareSkills);
  const softwareParts: string[] = [];
  for (const n of SOFTWARE_OPTIONS) {
    if (sw.set.has(n)) softwareParts.push(n);
  }
  if (sw.set.has(SOFTWARE_OTHER_LABEL)) {
    const ex = sw.otherDetail.trim();
    softwareParts.push(ex ? `Other: ${ex}` : SOFTWARE_OTHER_LABEL);
  }

  return {
    name: (u.name ?? "").trim() || null,
    phone: (u.phone ?? "").trim() || null,
    whatsappUrl: null,
    linkedinUrl: (u.linkedinUrl ?? "").trim() || null,
    instagramUrl: null,
    university: (u.university ?? "").trim() || null,
    yearOfStudy: u.yearOfStudy || null,
    major,
    interests: ip.interests,
    otherInterests: ip.otherInterests,
    softwareSkills: softwareParts.length ? softwareParts.join(", ") : null,
    bio: (u.bio ?? "").trim() || null,
    portfolioUrl: (u.portfolioUrl ?? "").trim() || null,
    portfolioVisibleToOthers: u.portfolioVisibleToOthers ?? true,
  };
}

type Props = { user: EditProfileUser };

export function EditProfileForm({ user: initial }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: TabId = TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : "personal";

  const setTab = useCallback(
    (id: TabId) => {
      const u = new URLSearchParams(searchParams.toString());
      u.set("tab", id);
      router.replace(`/student/profile/edit?${u.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const [name, setName] = useState(initial.name ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(initial.linkedinUrl ?? "");

  const [university, setUniversity] = useState(initial.university ?? "");
  const [yearOfStudy, setYearOfStudy] = useState(initial.yearOfStudy ?? "");
  const progInit = useMemo(() => programFromMajor(initial.major), [initial.major]);
  const [program, setProgram] = useState(progInit.program);
  const [majorOther, setMajorOther] = useState(progInit.majorOther);

  const interestInit = useMemo(
    () => interestStateFromServer(parseInterests(initial.interests), initial.otherInterests),
    [initial.interests, initial.otherInterests],
  );
  const [interestSel, setInterestSel] = useState(() => new Set(interestInit.sel));
  const [othersDetail, setOthersDetail] = useState(interestInit.others);

  const swInit = useMemo(() => initSoftwareSet(initial.softwareSkills), [initial.softwareSkills]);
  const [softwareSel, setSoftwareSel] = useState(() => swInit.set);
  const [softwareOtherDetail, setSoftwareOtherDetail] = useState(swInit.otherDetail);

  const [bio, setBio] = useState(initial.bio ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(initial.portfolioUrl ?? "");
  const [portfolioFileLabel, setPortfolioFileLabel] = useState(initial.portfolioFileName ?? "");
  const [portfolioVisibleToOthers, setPortfolioVisibleToOthers] = useState(
    initial.portfolioVisibleToOthers ?? true,
  );
  const [saving, setSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const portfolioFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(initial.name ?? "");
    setPhone(initial.phone ?? "");
    setLinkedinUrl(initial.linkedinUrl ?? "");
    setUniversity(initial.university ?? "");
    setYearOfStudy(initial.yearOfStudy ?? "");
    const p = programFromMajor(initial.major);
    setProgram(p.program);
    setMajorOther(p.majorOther);
    const nextI = interestStateFromServer(parseInterests(initial.interests), initial.otherInterests);
    setInterestSel(new Set(nextI.sel));
    setOthersDetail(nextI.others);
    const sw = initSoftwareSet(initial.softwareSkills);
    setSoftwareSel(sw.set);
    setSoftwareOtherDetail(sw.otherDetail);
    setBio(initial.bio ?? "");
    setPortfolioUrl(initial.portfolioUrl ?? "");
    setPortfolioFileLabel(initial.portfolioFileName ?? "");
    setPortfolioVisibleToOthers(initial.portfolioVisibleToOthers ?? true);
  }, [initial]);

  const toggleInterest = (id: string) => {
    setInterestSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSoftware = (id: string) => {
    setSoftwareSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const patch = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Save failed");
  }, []);

  const manualSaveRef = useRef(false);

  const buildPayload = useCallback((): Record<string, unknown> => {
    let major: string | null = null;
    if (program === PROGRAM_OTHER_VALUE) {
      major = majorOther.trim() || null;
    } else if (program) {
      major = program;
    }

    const ip = interestsPayloadFromSelection(interestSel, othersDetail);

    const softwareParts: string[] = [];
    for (const n of SOFTWARE_OPTIONS) {
      if (softwareSel.has(n)) softwareParts.push(n);
    }
    if (softwareSel.has(SOFTWARE_OTHER_LABEL)) {
      const ex = softwareOtherDetail.trim();
      softwareParts.push(ex ? `Other: ${ex}` : SOFTWARE_OTHER_LABEL);
    }

    return {
      name: name.trim() || null,
      phone: phone.trim() || null,
      whatsappUrl: null,
      linkedinUrl: linkedinUrl.trim() || null,
      instagramUrl: null,
      university: university.trim() || null,
      yearOfStudy: yearOfStudy || null,
      major,
      interests: ip.interests,
      otherInterests: ip.otherInterests,
      softwareSkills: softwareParts.length ? softwareParts.join(", ") : null,
      bio: bio.trim() || null,
      portfolioUrl: portfolioUrl.trim() || null,
      portfolioVisibleToOthers,
    };
  }, [
    name,
    phone,
    linkedinUrl,
    university,
    yearOfStudy,
    program,
    majorOther,
    interestSel,
    othersDetail,
    softwareSel,
    softwareOtherDetail,
    bio,
    portfolioUrl,
    portfolioVisibleToOthers,
  ]);

  const initialPayloadJson = useMemo(() => JSON.stringify(payloadFromInitialUser(initial)), [initial]);

  const lastSavedJsonRef = useRef(initialPayloadJson);
  const [autoSave, setAutoSave] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    lastSavedJsonRef.current = initialPayloadJson;
  }, [initialPayloadJson]);

  useEffect(() => {
    const json = JSON.stringify(buildPayload());
    if (json === lastSavedJsonRef.current) return;
    setAutoSave((s) => (s === "error" ? "idle" : s));
    let cancelled = false;
    const t = window.setTimeout(async () => {
      if (cancelled || manualSaveRef.current) return;
      const payload = buildPayload();
      const j = JSON.stringify(payload);
      if (j === lastSavedJsonRef.current) return;
      setAutoSave("saving");
      try {
        await patch(payload);
        if (cancelled) return;
        lastSavedJsonRef.current = JSON.stringify(buildPayload());
        setAutoSave("saved");
        router.refresh();
        window.setTimeout(() => {
          if (!cancelled) setAutoSave("idle");
        }, 2000);
      } catch {
        if (!cancelled) setAutoSave("error");
      }
    }, 900);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [buildPayload, patch, router]);

  const onSave = async () => {
    if (!name.trim()) {
      window.alert("Please enter your full name.");
      setTab("personal");
      return;
    }
    if (!phone.trim()) {
      window.alert("Please enter your phone number.");
      setTab("personal");
      return;
    }
    if (!linkedinUrl.trim()) {
      window.alert("Please enter your LinkedIn profile URL.");
      setTab("personal");
      return;
    }
    if (!university.trim()) {
      window.alert("Please enter your university or college.");
      setTab("academic");
      return;
    }
    if (!yearOfStudy) {
      window.alert("Please select your year of study.");
      setTab("academic");
      return;
    }
    if (!program) {
      window.alert("Please select your major / program.");
      setTab("academic");
      return;
    }
    if (program === PROGRAM_OTHER_VALUE && !majorOther.trim()) {
      window.alert("Please specify your program.");
      setTab("academic");
      return;
    }

    const ip = interestsPayloadFromSelection(interestSel, othersDetail);
    if (interestSel.has(INTEREST_OTHERS_LABEL)) {
      if (!othersDetail.trim()) {
        window.alert('Please describe your interests under "Others".');
        setTab("interests");
        return;
      }
    }
    if (!ip.interests?.length) {
      window.alert("Please select at least one interest.");
      setTab("interests");
      return;
    }

    if (softwareSel.size === 0) {
      window.alert("Please select at least one software skill.");
      setTab("interests");
      return;
    }
    if (softwareSel.has(SOFTWARE_OTHER_LABEL) && !softwareOtherDetail.trim()) {
      window.alert('Please name the software you use under "Other".');
      setTab("interests");
      return;
    }

    if (!bio.trim()) {
      window.alert("Please fill in About you.");
      setTab("portfolio");
      return;
    }

    const payload = buildPayload();
    setSaving(true);
    manualSaveRef.current = true;
    try {
      await patch({ ...payload, profileComplete: true });
      lastSavedJsonRef.current = JSON.stringify(buildPayload());
      router.push("/student");
      router.refresh();
    } catch {
      window.alert("Could not save. Try again.");
    } finally {
      manualSaveRef.current = false;
      setSaving(false);
    }
  };

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

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file?.type.startsWith("image/")) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, { maxEdge: 512, quality: 0.88 });
      await patch({ image: dataUrl });
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  const initials = (name || "ST")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#0a0a0a] sm:text-[1.65rem]">
            Edit Your Profile
          </h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-[#6b7280] sm:text-sm">
            Keep your information up to date to get better mentor matches.
          </p>
          <p className="mt-2 text-[12px] font-medium text-[#6b7280]" aria-live="polite">
            {autoSave === "saving" ? (
              <span className="text-primary">Saving…</span>
            ) : autoSave === "saved" ? (
              <span className="text-emerald-700">All changes saved</span>
            ) : autoSave === "error" ? (
              <span className="text-red-600">Could not auto-save. Check connection and try again.</span>
            ) : (
              <span className="text-[#9ca3af]">Changes save automatically</span>
            )}
          </p>
        </div>
        <Link
          href="/student"
          className="shrink-0 text-[13px] font-medium text-[#4b5563] transition hover:text-primary"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="mb-8 rounded-xl bg-[#ececef] p-1.5 ring-1 ring-black/[0.04] sm:p-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`min-h-[44px] rounded-[10px] px-2 py-2.5 text-center text-[11px] font-medium leading-snug transition sm:min-h-[48px] sm:px-3 sm:text-[13px] ${
                activeTab === t.id
                  ? "bg-white text-[#0a0a0a] shadow-sm ring-1 ring-black/[0.06]"
                  : "text-[#6b7280] hover:text-[#0a0a0a]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm sm:p-8">
        {activeTab === "personal" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-[#0a0a0a]">Personal Information</h2>
              <p className="mt-0.5 text-[13px] text-[#6b7280]">Update your basic personal details.</p>
            </div>
            <div>
              <p className={label}>Profile Photo</p>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xl font-semibold text-primary ring-2 ring-black/[0.06]">
                  {initial.image?.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={initial.image} alt="" className="size-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-black/[0.12] bg-white px-4 py-2 text-[13px] font-medium text-[#0a0a0a] shadow-sm hover:bg-neutral-50"
                  >
                    <UploadMiniIcon className="size-4 text-[#6b7280]" />
                    Upload New Photo
                  </button>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="edit-name">
                  Full name <span className="text-primary">*</span>
                </label>
                <input id="edit-name" className={field} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className={label} htmlFor="edit-email">
                  Email
                </label>
                <input
                  id="edit-email"
                  className={`${field} bg-neutral-50/80 text-[#6b7280]`}
                  value={initial.email ?? ""}
                  readOnly
                />
              </div>
            </div>
            <div>
              <label className={label} htmlFor="edit-phone">
                Phone number <span className="text-primary">*</span>
              </label>
              <input
                id="edit-phone"
                className={field}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div>
              <label className={label} htmlFor="edit-linkedin">
                LinkedIn profile URL <span className="text-primary">*</span>
              </label>
              <input
                id="edit-linkedin"
                type="url"
                className={field}
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>
        )}

        {activeTab === "academic" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-[#0a0a0a]">Academic Information</h2>
              <p className="mt-0.5 text-[13px] text-[#6b7280]">Update your educational background.</p>
            </div>
            <div>
              <label className={label} htmlFor="edit-uni">
                University / College <span className="text-primary">*</span>
              </label>
              <input id="edit-uni" className={field} value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="Your university" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="edit-year">
                  Year of study <span className="text-primary">*</span>
                </label>
                <select
                  id="edit-year"
                  className={`${field} appearance-none bg-white`}
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                >
                  <option value="">Select year</option>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="edit-program">
                  Major / Program <span className="text-primary">*</span>
                </label>
                <select
                  id="edit-program"
                  className={`${field} appearance-none bg-white`}
                  value={program}
                  onChange={(e) => {
                    setProgram(e.target.value);
                    if (e.target.value !== PROGRAM_OTHER_VALUE) setMajorOther("");
                  }}
                >
                  <option value="">Select program</option>
                  {PROGRAM_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value={PROGRAM_OTHER_VALUE}>Other</option>
                </select>
                {program === PROGRAM_OTHER_VALUE && (
                  <input
                    className={`${field} mt-2`}
                    value={majorOther}
                    onChange={(e) => setMajorOther(e.target.value)}
                    placeholder="Specify your program"
                  />
                )}
              </div>
            </div>
            <div className="rounded-xl border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-[13px] leading-relaxed text-sky-900">
              <p className="font-semibold text-sky-950">Why keep this updated?</p>
              <p className="mt-1 text-sky-900/90">Mentors use this information to tailor guidance and match your academic level.</p>
            </div>
          </div>
        )}

        {activeTab === "interests" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-[#0a0a0a]">Interests &amp; Skills</h2>
              <p className="mt-0.5 text-[13px] text-[#6b7280]">Share what you&apos;re passionate about and your skillset.</p>
            </div>
            <div>
              <p className={`${label} mb-2`}>
                Interests in Architecture <span className="text-primary">*</span>
              </p>
              <ArchitectureGroupedPills
                selected={interestSel}
                onToggle={toggleInterest}
                classNameOn={chipOn}
                classNameOff="border-[#e5e7eb] bg-white text-neutral-700 hover:border-neutral-300"
              />
              <div className="mb-8">
                <h3 className={architectureOthersSectionTitle}>{INTEREST_OTHERS_LABEL}</h3>
                <div className={architectureOthersSectionRule} aria-hidden />
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => toggleInterest(INTEREST_OTHERS_LABEL)}
                    className={`${architecturePillBase} ${interestSel.has(INTEREST_OTHERS_LABEL) ? chipOn : "border-[#e5e7eb] bg-white text-neutral-700 hover:border-neutral-300"}`}
                  >
                    {INTEREST_OTHERS_LABEL}
                  </button>
                </div>
                {interestSel.has(INTEREST_OTHERS_LABEL) && (
                  <textarea
                    className={`${field} mt-4 min-h-[88px] resize-y`}
                    value={othersDetail}
                    onChange={(e) => setOthersDetail(e.target.value)}
                    placeholder="Describe your other architecture interests..."
                  />
                )}
              </div>
            </div>
            <div>
              <p className={`${label} mb-2`}>
                Software skills <span className="text-primary">*</span>
              </p>
              <p className="mb-2 text-[12px] text-[#6b7280]">
                Select at least one. If you choose Other, name the tool(s) in the field below.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SOFTWARE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleSoftware(opt)}
                    className={`rounded-xl border py-2.5 text-center text-[13px] font-medium transition ${softwareSel.has(opt) ? chipOn : chipOff}`}
                  >
                    {opt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => toggleSoftware(SOFTWARE_OTHER_LABEL)}
                  className={`rounded-xl border py-2.5 text-center text-[13px] font-medium transition ${softwareSel.has(SOFTWARE_OTHER_LABEL) ? chipOn : chipOff}`}
                >
                  {SOFTWARE_OTHER_LABEL}
                </button>
              </div>
              {softwareSel.has(SOFTWARE_OTHER_LABEL) && (
                <input
                  className={`${field} mt-3`}
                  value={softwareOtherDetail}
                  onChange={(e) => setSoftwareOtherDetail(e.target.value)}
                  placeholder="e.g., Grasshopper, Dynamo..."
                />
              )}
            </div>
          </div>
        )}

        {activeTab === "portfolio" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-[#0a0a0a]">Portfolio &amp; Bio</h2>
              <p className="mt-0.5 text-[13px] text-[#6b7280]">Showcase your work and tell your story.</p>
            </div>
            <div>
              <label className={label} htmlFor="edit-bio">
                About you <span className="text-primary">*</span>
              </label>
              <textarea
                id="edit-bio"
                className={`${field} min-h-[140px] resize-y`}
                rows={6}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell mentors about yourself, your goals, and what you're looking for in a mentor..."
              />
              <p className="mt-1.5 text-[12px] text-[#6b7280]">
                Required. A short, genuine bio helps mentors know how to support you.
              </p>
            </div>
            <div>
              <label className={label} htmlFor="edit-portfolio">
                Portfolio URL <span className="font-normal text-[#9ca3af]">(Optional)</span>
              </label>
              <input
                id="edit-portfolio"
                type="url"
                className={field}
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://johndoe.design"
              />
            </div>
            <div>
              <span className={label}>Upload Portfolio (Optional)</span>
              <input
                ref={portfolioFileRef}
                type="file"
                accept=".pdf,.zip,application/pdf,application/zip,application/x-zip-compressed"
                className="hidden"
                onChange={onPortfolioFile}
              />
              <button
                type="button"
                onClick={() => portfolioFileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#d1d5dc] bg-white px-3 py-8 text-center transition-colors hover:border-primary/35 hover:bg-neutral-50/80"
              >
                <UploadAreaIcon className="mb-2 size-9 text-[#4a5565]" />
                <p className="text-[13px] font-medium text-[#4a5565]">Click to upload PDF or ZIP file</p>
                <p className="mt-0.5 text-[11px] font-medium text-[#99a1af]">Max file size: 10MB</p>
              </button>
              {portfolioFileLabel ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-black/[0.08] bg-neutral-50/90 px-3 py-2 text-[13px]">
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
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.08] bg-white px-3 py-3 text-left">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 rounded border-neutral-300 text-primary focus:ring-primary"
                checked={portfolioVisibleToOthers}
                onChange={(e) => setPortfolioVisibleToOthers(e.target.checked)}
              />
              <span>
                <span className="block text-[13px] font-medium text-[#0a0a0a]">
                  Let mentors open my portfolio
                </span>
                <span className="mt-0.5 block text-[12px] leading-snug text-[#6b7280]">
                  When enabled, mentors you interact with can open your uploaded PDF/ZIP or portfolio link from your
                  profile. You can turn this off anytime.
                </span>
              </span>
            </label>
            <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-[13px] leading-relaxed text-emerald-950">
              <p className="font-semibold text-emerald-950">Pro Tip</p>
              <p className="mt-1 text-emerald-900/95">
                A well-organized portfolio helps mentors provide more specific and valuable feedback on your work.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => router.push("/student")}
          className="rounded-lg border border-black/[0.12] bg-white px-5 py-2.5 text-[13px] font-medium text-[#0a0a0a] hover:bg-neutral-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void onSave()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
        >
          <SaveIcon className="size-4" />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function UploadAreaIcon({ className }: { className?: string }) {
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

function UploadMiniIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 16V8m0 0l3 3m-3-3L9 11M4 16.8V19a2 2 0 002 2h12a2 2 0 002-2v-2.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
