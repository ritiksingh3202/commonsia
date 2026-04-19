"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MentorEditProfileInitial } from "@/components/mentor/mentor-edit-profile-types";
import {
  MENTOR_EXPERTISE_OTHER,
  MENTOR_MENTEE_CAPACITY_OPTIONS,
  MENTOR_SESSION_PREFS,
  MENTOR_YEARS_OPTIONS,
  normalizeMentorYearsBand,
} from "@/components/mentor/mentor-setup-constants";
import {
  SOFTWARE_OPTIONS,
  SOFTWARE_OTHER_LABEL,
} from "@/components/student/student-setup-constants";
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
import { MandatorySetupReminderModal } from "@/components/setup/MandatorySetupReminderModal";

type TabId = "personal" | "professional" | "mentorship" | "profile";

const field =
  "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-[#0a0a0a] shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-primary focus:ring-2 focus:ring-primary/15";

const label = "text-sm font-semibold text-[#0a0a0a]";

const chipBase =
  "rounded-xl border-2 px-3 py-2.5 text-center text-[13px] font-medium leading-snug transition sm:text-sm";

const chipOn = "border-primary bg-primary/[0.06] text-primary";
const chipOff = "border-neutral-200 bg-white text-[#0a0a0a] hover:border-neutral-300";

const tabs: { id: TabId; label: string }[] = [
  { id: "personal", label: "Personal Info" },
  { id: "professional", label: "Professional" },
  { id: "mentorship", label: "Mentorship" },
  { id: "profile", label: "Profile & Links" },
];

const MAX_PHOTO_BYTES = 1.8 * 1024 * 1024;

function parseExpertiseFromDb(raw: unknown): { set: Set<string>; other: string } {
  const list = Array.isArray(raw)
    ? raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  const { sel, other } = mentorExpertiseStateFromServer(list, MENTOR_EXPERTISE_OTHER);
  return { set: sel, other };
}

function parseSoftwareFromDb(raw: string | null): { set: Set<string>; other: string } {
  const set = new Set<string>();
  let other = "";
  if (!raw?.trim()) return { set, other };
  const segments = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const optSet = new Set<string>(SOFTWARE_OPTIONS);
  for (const seg of segments) {
    if (seg.startsWith("Other:")) {
      set.add(SOFTWARE_OTHER_LABEL);
      other = seg.slice(6).trim();
    } else if (optSet.has(seg)) {
      set.add(seg);
    } else if (seg === SOFTWARE_OTHER_LABEL) {
      set.add(SOFTWARE_OTHER_LABEL);
    }
  }
  return { set, other };
}

function serializeSoftware(set: Set<string>, otherDetail: string): string | null {
  const parts: string[] = [];
  for (const name of SOFTWARE_OPTIONS) {
    if (set.has(name)) parts.push(name);
  }
  if (set.has(SOFTWARE_OTHER_LABEL)) {
    const extra = otherDetail.trim();
    if (extra) parts.push(`Other: ${extra}`);
    else parts.push(SOFTWARE_OTHER_LABEL);
  }
  return parts.length ? parts.join(", ") : null;
}

function normalizeYear(y: string | null | undefined): string {
  return normalizeMentorYearsBand(y);
}

function initials(name: string | null): string {
  if (!name?.trim()) return "?";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function mentorPayloadFromInitial(i: MentorEditProfileInitial): Record<string, unknown> {
  const { set: exp, other } = parseExpertiseFromDb(i.mentorExpertise);
  const expertiseList = mentorExpertiseListFromSelection(exp, other, MENTOR_EXPERTISE_OTHER);
  const sw = parseSoftwareFromDb(i.softwareSkills);
  const years = normalizeYear(i.mentorYearsExperience);
  const availRaw = i.mentorAvailabilityPref?.trim();
  const availability =
    availRaw && MENTOR_SESSION_PREFS.includes(availRaw as (typeof MENTOR_SESSION_PREFS)[number])
      ? availRaw
      : MENTOR_SESSION_PREFS[0];
  const maxRaw = i.mentorMaxMenteesPref?.trim();
  const maxMentees =
    maxRaw && MENTOR_MENTEE_CAPACITY_OPTIONS.includes(maxRaw as (typeof MENTOR_MENTEE_CAPACITY_OPTIONS)[number])
      ? maxRaw
      : MENTOR_MENTEE_CAPACITY_OPTIONS[1];

  return {
    name: (i.name ?? "").trim(),
    phone: (i.phone ?? "").trim() || null,
    mentorTitle: (i.mentorTitle ?? "").trim() || null,
    mentorCompany: (i.mentorCompany ?? "").trim() || null,
    mentorYearsExperience: years.trim() || null,
    mentorExpertise: expertiseList,
    softwareSkills: serializeSoftware(sw.set, sw.other),
    mentorMentorshipFocus: (i.mentorMentorshipFocus ?? "").trim(),
    mentorAvailabilityPref: availability,
    mentorMaxMenteesPref: maxMentees,
    bio: (i.bio ?? "").trim(),
    linkedinUrl: (i.linkedinUrl ?? "").trim() || null,
    portfolioUrl: (i.portfolioUrl ?? "").trim() || null,
    portfolioVisibleToOthers: i.portfolioVisibleToOthers ?? true,
    mentorCertifications: (i.mentorCertifications ?? "").trim() || null,
  };
}

export function MentorEditProfileForm({ initial }: { initial: MentorEditProfileInitial }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<TabId>("personal");
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<"ok" | "err" | null>(null);
  const [mandatoryExitOpen, setMandatoryExitOpen] = useState(false);

  const [fullName, setFullName] = useState(initial.name ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);

  const [currentPosition, setCurrentPosition] = useState(initial.mentorTitle ?? "");
  const [company, setCompany] = useState(initial.mentorCompany ?? "");
  const [yearsOfExperience, setYearsOfExperience] = useState(() =>
    normalizeYear(initial.mentorYearsExperience),
  );

  const expertiseInit = useMemo(() => parseExpertiseFromDb(initial.mentorExpertise), [initial.mentorExpertise]);
  const [expertise, setExpertise] = useState<Set<string>>(() => new Set(expertiseInit.set));
  const [otherExpertise, setOtherExpertise] = useState(expertiseInit.other);

  const softwareInit = useMemo(() => parseSoftwareFromDb(initial.softwareSkills), [initial.softwareSkills]);
  const [software, setSoftware] = useState<Set<string>>(() => new Set(softwareInit.set));
  const [softwareOther, setSoftwareOther] = useState(softwareInit.other);

  const [mentoringAreas, setMentoringAreas] = useState(initial.mentorMentorshipFocus ?? "");
  const [availability, setAvailability] = useState(() => {
    const v = initial.mentorAvailabilityPref?.trim();
    if (v && MENTOR_SESSION_PREFS.includes(v as (typeof MENTOR_SESSION_PREFS)[number])) return v;
    return MENTOR_SESSION_PREFS[0];
  });
  const [maxMentees, setMaxMentees] = useState(() => {
    const v = initial.mentorMaxMenteesPref?.trim();
    if (v && MENTOR_MENTEE_CAPACITY_OPTIONS.includes(v as (typeof MENTOR_MENTEE_CAPACITY_OPTIONS)[number]))
      return v;
    return MENTOR_MENTEE_CAPACITY_OPTIONS[1];
  });

  const [bio, setBio] = useState(initial.bio ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(initial.linkedinUrl ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(initial.portfolioUrl ?? "");
  const [portfolioFileLabel, setPortfolioFileLabel] = useState(initial.portfolioFileName ?? "");
  const [portfolioVisibleToOthers, setPortfolioVisibleToOthers] = useState(
    initial.portfolioVisibleToOthers ?? true,
  );
  const [certifications, setCertifications] = useState(initial.mentorCertifications ?? "");
  const portfolioFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchParams.get("addPhoto") !== "1") return;
    setTab("personal");
    const id = window.setTimeout(() => {
      fileRef.current?.click();
      const u = new URLSearchParams(searchParams.toString());
      u.delete("addPhoto");
      router.replace(`/mentor/profile/edit?${u.toString()}`, { scroll: false });
    }, 0);
    return () => window.clearTimeout(id);
  }, [searchParams, router]);

  const displayPhotoSrc = previewObjectUrl || imageDataUrl || initial.image || null;

  const revokePreview = useCallback(() => {
    setPreviewObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      window.alert("Please choose an image file.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      window.alert("Image is too large. Please use a photo under 1.8 MB.");
      return;
    }
    revokePreview();
    const url = URL.createObjectURL(file);
    setPreviewObjectUrl(url);
    setImageDataUrl(null);
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === "string") setImageDataUrl(r);
    };
    reader.readAsDataURL(file);
  };

  const toggleExpertise = (opt: string) => {
    setExpertise((prev) => {
      const next = new Set(prev);
      if (next.has(opt)) next.delete(opt);
      else next.add(opt);
      return next;
    });
  };

  const toggleSoftware = (opt: string) => {
    setSoftware((prev) => {
      const next = new Set(prev);
      if (next.has(opt)) next.delete(opt);
      else next.add(opt);
      return next;
    });
  };

  const patchProfile = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("save failed");
  }, []);

  const buildMentorPayload = useCallback((): Record<string, unknown> => {
    const expertiseList = mentorExpertiseListFromSelection(
      expertise,
      otherExpertise,
      MENTOR_EXPERTISE_OTHER,
    );
    return {
      name: fullName.trim(),
      phone: phone.trim() || null,
      mentorTitle: currentPosition.trim() || null,
      mentorCompany: company.trim() || null,
      mentorYearsExperience: yearsOfExperience.trim() || null,
      mentorExpertise: expertiseList,
      softwareSkills: serializeSoftware(software, softwareOther),
      mentorMentorshipFocus: mentoringAreas.trim(),
      mentorAvailabilityPref: availability,
      mentorMaxMenteesPref: maxMentees,
      bio: bio.trim(),
      linkedinUrl: linkedinUrl.trim() || null,
      portfolioUrl: portfolioUrl.trim() || null,
      portfolioVisibleToOthers,
      mentorCertifications: certifications.trim() || null,
    };
  }, [
    fullName,
    phone,
    currentPosition,
    company,
    yearsOfExperience,
    expertise,
    otherExpertise,
    software,
    softwareOther,
    mentoringAreas,
    availability,
    maxMentees,
    bio,
    linkedinUrl,
    portfolioUrl,
    portfolioVisibleToOthers,
    certifications,
  ]);

  const initialPayloadJson = useMemo(() => JSON.stringify(mentorPayloadFromInitial(initial)), [initial]);

  const lastSavedJsonRef = useRef(initialPayloadJson);
  const manualSaveRef = useRef(false);
  const [autoSave, setAutoSave] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    lastSavedJsonRef.current = initialPayloadJson;
  }, [initialPayloadJson]);

  useEffect(() => {
    const base = buildMentorPayload();
    const payload: Record<string, unknown> = { ...base };
    if (imageDataUrl) payload.image = imageDataUrl;
    const json = JSON.stringify(payload);
    if (json === lastSavedJsonRef.current) return;
    setAutoSave((s) => (s === "error" ? "idle" : s));
    let cancelled = false;
    const t = window.setTimeout(async () => {
      if (cancelled || manualSaveRef.current) return;
      const p: Record<string, unknown> = { ...buildMentorPayload() };
      if (imageDataUrl) p.image = imageDataUrl;
      const j = JSON.stringify(p);
      if (j === lastSavedJsonRef.current) return;
      setAutoSave("saving");
      try {
        await patchProfile(p);
        if (cancelled) return;
        if (imageDataUrl) {
          revokePreview();
          setImageDataUrl(null);
        }
        lastSavedJsonRef.current = JSON.stringify(buildMentorPayload());
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
  }, [buildMentorPayload, imageDataUrl, patchProfile, revokePreview, router]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      window.alert("Please enter your full name.");
      setTab("personal");
      return;
    }
    if (expertise.size === 0) {
      window.alert("Select at least one area of expertise.");
      setTab("professional");
      return;
    }
    if (expertise.has(MENTOR_EXPERTISE_OTHER) && !otherExpertise.trim()) {
      window.alert('Please describe your area under "Other".');
      setTab("professional");
      return;
    }
    if (!mentoringAreas.trim()) {
      window.alert("Please describe what you would like to mentor students on.");
      setTab("mentorship");
      return;
    }
    if (!bio.trim()) {
      window.alert("Please add your professional bio.");
      setTab("profile");
      return;
    }

    const payload: Record<string, unknown> = { ...buildMentorPayload() };
    if (imageDataUrl) payload.image = imageDataUrl;

    setSaving(true);
    manualSaveRef.current = true;
    setBanner(null);
    try {
      await patchProfile(payload);
      lastSavedJsonRef.current = JSON.stringify(buildMentorPayload());
      setBanner("ok");
      revokePreview();
      setImageDataUrl(null);
      router.refresh();
      window.setTimeout(() => setBanner(null), 3200);
    } catch {
      setBanner("err");
      window.alert("Could not save your profile. Try again.");
    } finally {
      manualSaveRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50/25 to-white pb-16">
      <MandatorySetupReminderModal
        open={mandatoryExitOpen}
        variant="mentor"
        onDismiss={() => setMandatoryExitOpen(false)}
      />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0a0a0a] sm:text-3xl">
              Edit Your Profile
            </h1>
            <p className="mt-1.5 text-sm text-neutral-600 sm:text-base">
              Update your information to help students find you
            </p>
            <p className="mt-2 text-xs font-medium text-neutral-500 sm:text-sm" aria-live="polite">
              {autoSave === "saving" ? (
                <span className="text-primary">Saving…</span>
              ) : autoSave === "saved" ? (
                <span className="text-emerald-700">All changes saved</span>
              ) : autoSave === "error" ? (
                <span className="text-red-600">Could not auto-save. Check connection and try again.</span>
              ) : (
                <span className="text-neutral-400">Changes save automatically</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMandatoryExitOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 self-start text-sm font-medium text-neutral-700 transition hover:text-primary"
          >
            <IconArrowLeft className="size-4" />
            Back to Dashboard
          </button>
        </div>

        {banner === "ok" ? (
          <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
            Profile updated successfully.
          </p>
        ) : null}

        <div
          role="tablist"
          aria-label="Profile sections"
          className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-neutral-100/90 p-1 sm:grid-cols-4"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-2 py-2.5 text-center text-[12px] font-medium transition sm:text-[13px] ${
                tab === t.id
                  ? "bg-white text-[#0a0a0a] shadow-sm ring-1 ring-black/5"
                  : "text-neutral-600 hover:bg-white/60 hover:text-[#0a0a0a]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
          {tab === "personal" ? (
            <div role="tabpanel">
              <div className="mb-6 border-b border-neutral-100 pb-5">
                <h2 className="text-lg font-bold text-[#0a0a0a]">Personal Information</h2>
                <p className="mt-1 text-sm text-neutral-500">Update your basic personal details</p>
              </div>
              <div className="space-y-6">
                <div>
                  <p className={label}>Profile Photo</p>
                  <div className="mt-3 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    <div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-primary/10 text-2xl font-semibold text-primary ring-2 ring-white">
                      {displayPhotoSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element -- blob/data URLs for local preview
                        <img
                          src={displayPhotoSrc}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center">{initials(fullName)}</span>
                      )}
                    </div>
                    <div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handlePhotoChange}
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-[#0a0a0a] shadow-sm transition hover:bg-neutral-50"
                      >
                        <IconUpload className="size-4 text-neutral-600" />
                        Upload New Photo
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="fullName" className={label}>
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={field}
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className={label}>
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={initial.email ?? ""}
                      readOnly
                      className={`${field} cursor-not-allowed bg-neutral-50 text-neutral-600`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className={label}>
                    Phone Number <span className="font-normal text-neutral-500">(Optional)</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={field}
                    autoComplete="tel"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {tab === "professional" ? (
            <div role="tabpanel">
              <div className="mb-6 border-b border-neutral-100 pb-5">
                <h2 className="text-lg font-bold text-[#0a0a0a]">Professional Information</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Share your professional background and expertise
                </p>
              </div>
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="position" className={label}>
                      Current Position / Title
                    </label>
                    <input
                      id="position"
                      value={currentPosition}
                      onChange={(e) => setCurrentPosition(e.target.value)}
                      className={field}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="company" className={label}>
                      Company / Organization
                    </label>
                    <input
                      id="company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className={field}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="years" className={label}>
                    Years of Experience
                  </label>
                  <div className="relative">
                    <select
                      id="years"
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(e.target.value)}
                      className={`${field} appearance-none pr-10`}
                    >
                      <option value="">Select experience level</option>
                      {MENTOR_YEARS_OPTIONS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
                  </div>
                </div>
                <div>
                  <p className={label}>Areas of Expertise</p>
                  <p className="mb-2 mt-1 text-xs text-neutral-500">Select all that apply</p>
                  <ArchitectureGroupedPills
                    selected={expertise}
                    onToggle={toggleExpertise}
                    classNameOn={chipOn}
                    classNameOff={chipOff}
                  />
                  <div className="mb-8">
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
                      <div className="mt-4 space-y-2">
                        <label htmlFor="otherExpertise" className={label}>
                          Describe your other expertise
                        </label>
                        <input
                          id="otherExpertise"
                          value={otherExpertise}
                          onChange={(e) => setOtherExpertise(e.target.value)}
                          placeholder="e.g., Exhibition design, Computational design"
                          className={field}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="border-t border-neutral-100 pt-5">
                  <p className={label}>Software &amp; tools</p>
                  <p className="mb-2 mt-1 text-xs text-neutral-500">
                    Same options as student onboarding — what you can help mentees with
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {SOFTWARE_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleSoftware(opt)}
                        className={`${chipBase} ${software.has(opt) ? chipOn : chipOff}`}
                      >
                        {opt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => toggleSoftware(SOFTWARE_OTHER_LABEL)}
                      className={`${chipBase} ${software.has(SOFTWARE_OTHER_LABEL) ? chipOn : chipOff}`}
                    >
                      {SOFTWARE_OTHER_LABEL}
                    </button>
                  </div>
                  {software.has(SOFTWARE_OTHER_LABEL) ? (
                    <div className="mt-3 space-y-2">
                      <label htmlFor="softwareOther" className={label}>
                        Other software
                      </label>
                      <input
                        id="softwareOther"
                        value={softwareOther}
                        onChange={(e) => setSoftwareOther(e.target.value)}
                        placeholder="e.g., Blender, Vectorworks"
                        className={field}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {tab === "mentorship" ? (
            <div role="tabpanel">
              <div className="mb-6 border-b border-neutral-100 pb-5">
                <h2 className="text-lg font-bold text-[#0a0a0a]">Mentorship Preferences</h2>
                <p className="mt-1 text-sm text-neutral-500">Define how you&apos;d like to mentor students</p>
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="mentoringAreas" className={label}>
                    What would you like to mentor students on?
                  </label>
                  <textarea
                    id="mentoringAreas"
                    value={mentoringAreas}
                    onChange={(e) => setMentoringAreas(e.target.value)}
                    rows={5}
                    className={`${field} min-h-[120px] resize-y`}
                  />
                  <p className="text-xs text-neutral-500">
                    Examples: portfolio development, career guidance, software skills, design critique
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="availability" className={label}>
                      Availability
                    </label>
                    <div className="relative">
                      <select
                        id="availability"
                        value={availability}
                        onChange={(e) => setAvailability(e.target.value)}
                        className={`${field} appearance-none pr-10`}
                      >
                        {MENTOR_SESSION_PREFS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="maxMentees" className={label}>
                      Maximum Number of Mentees
                    </label>
                    <div className="relative">
                      <select
                        id="maxMentees"
                        value={maxMentees}
                        onChange={(e) => setMaxMentees(e.target.value)}
                        className={`${field} appearance-none pr-10`}
                      >
                        {MENTOR_MENTEE_CAPACITY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50/90 p-4">
                  <h3 className="text-sm font-semibold text-sky-950">Mentoring Tips</h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-sky-900/90">
                    <li className="flex gap-2">
                      <span className="text-sky-600">•</span>
                      Be specific about what you can help students with
                    </li>
                    <li className="flex gap-2">
                      <span className="text-sky-600">•</span>
                      Set realistic availability that matches your schedule
                    </li>
                    <li className="flex gap-2">
                      <span className="text-sky-600">•</span>
                      Start with fewer mentees and scale up as you get comfortable
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "profile" ? (
            <div role="tabpanel">
              <div className="mb-6 border-b border-neutral-100 pb-5">
                <h2 className="text-lg font-bold text-[#0a0a0a]">Profile &amp; Professional Links</h2>
                <p className="mt-1 text-sm text-neutral-500">Help students learn more about you</p>
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="bio" className={label}>
                    Professional Bio
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={6}
                    placeholder="Tell students about your background, accomplishments, and why you want to mentor..."
                    className={`${field} min-h-[140px] resize-y`}
                  />
                  <p className="text-xs text-neutral-500">
                    This will be visible on your mentor profile. Make it engaging and personal!
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="linkedinUrl" className={label}>
                    LinkedIn Profile
                  </label>
                  <input
                    id="linkedinUrl"
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className={field}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="portfolioUrl" className={label}>
                    Portfolio / Website <span className="font-normal text-neutral-500">(Optional)</span>
                  </label>
                  <input
                    id="portfolioUrl"
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://yourportfolio.com"
                    className={field}
                  />
                </div>
                <div className="space-y-2">
                  <span className={label}>Upload portfolio (PDF or ZIP, optional)</span>
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
                    className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-white px-3 py-6 text-center transition-colors hover:border-primary/35 hover:bg-neutral-50/80"
                  >
                    <IconUpload className="mb-2 size-8 text-neutral-500" />
                    <p className="text-[13px] font-medium text-neutral-600">Click to upload PDF or ZIP</p>
                    <p className="mt-0.5 text-[11px] text-neutral-400">Max 10 MB</p>
                  </button>
                  {portfolioFileLabel ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50/90 px-3 py-2 text-[13px]">
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
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 rounded border-neutral-300 text-primary focus:ring-primary"
                    checked={portfolioVisibleToOthers}
                    onChange={(e) => setPortfolioVisibleToOthers(e.target.checked)}
                  />
                  <span>
                    <span className="block text-[13px] font-semibold text-[#0a0a0a]">
                      Let students open my portfolio
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-neutral-500">
                      When enabled, students can open your uploaded file or portfolio link from your public mentor
                      profile (when linked to a Commonsia account).
                    </span>
                  </span>
                </label>
                <div className="space-y-2">
                  <label htmlFor="certifications" className={label}>
                    Certifications &amp; Credentials
                  </label>
                  <input
                    id="certifications"
                    value={certifications}
                    onChange={(e) => setCertifications(e.target.value)}
                    placeholder="e.g., LEED AP, AIA, RIBA"
                    className={field}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
          <button
            type="button"
            onClick={() => setMandatoryExitOpen(true)}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 py-2.5 text-sm font-semibold text-[#0a0a0a] shadow-sm transition hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90 disabled:opacity-60"
          >
            <IconSave className="size-4" />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function IconArrowLeft({ className }: { className?: string }) {
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

function IconSave({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 4h9l3 3v13a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M8 4v4h8V7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
