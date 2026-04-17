import { normalizeMentorYearsBand } from "@/components/mentor/mentor-setup-constants";
import { MENTOR_PAGE_HERO_ASSETS } from "@/lib/mentor-page-assets";
import { formatNextAvailableSlotLine } from "@/lib/mentor-next-slot";
import { CacheKeys, CacheTtl, withJsonCache } from "@/lib/redis-cache";
import { prisma } from "@/lib/prisma";

/** Public mentor shape for directory cards + profile pages. */
export type Mentor = {
  id: string;
  name: string;
  /** Title + company, e.g. "Assistant Professor, CEPT" */
  role: string;
  tags: string[];
  slot: string;
  image: string;
  /** True when the user uploaded or OAuth provided an avatar (not the default placeholder). */
  hasProfilePhoto: boolean;
  /** Same as `id` when backed by a real User — used for messages / schedule. */
  linkedUserId: string | null;
  /** One paragraph under hero on public profile */
  summary: string;
  /** Bullets for "Experience & Background" */
  experienceLines: string[];
  /** Public LinkedIn URL when the mentor added one */
  linkedinUrl: string | null;
  /** Raw certifications / credentials string (achievements tab) */
  certifications: string | null;
  /** Custom cover banner (data URL or HTTPS); public profile uses `/profile_cover.png` when null. */
  bannerImageUrl: string | null;
  /** Whether mentor finished onboarding (useful for directory filters). */
  onboardingComplete: boolean;
  /** Saved years band from mentor profile (e.g. `0–2 years`, `2–5 years`). */
  yearsExperience: string | null;
};

/** Full row for a single mentor profile (includes banner — can be large). */
const mentorSelectFull = {
  id: true,
  name: true,
  email: true,
  image: true,
  bio: true,
  mentorTitle: true,
  mentorCompany: true,
  mentorYearsExperience: true,
  mentorExpertise: true,
  mentorMentorshipFocus: true,
  mentorCertifications: true,
  mentorAvailabilityJson: true,
  mentorOnboardingComplete: true,
  linkedinUrl: true,
  bannerImageUrl: true,
} as const;

/**
 * Directory / “similar” list: omit `bannerImageUrl` (often multi‑MB data URLs).
 * Keeps Next.js + Redis payloads small; profile page loads banner via {@link getPublicMentorById}.
 */
const mentorSelectDirectory = {
  id: true,
  name: true,
  email: true,
  image: true,
  bio: true,
  mentorTitle: true,
  mentorCompany: true,
  mentorYearsExperience: true,
  mentorExpertise: true,
  mentorMentorshipFocus: true,
  mentorCertifications: true,
  mentorAvailabilityJson: true,
  mentorOnboardingComplete: true,
  linkedinUrl: true,
} as const;

type MentorRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  mentorTitle: string | null;
  mentorCompany: string | null;
  mentorYearsExperience: string | null;
  mentorExpertise: unknown;
  mentorMentorshipFocus: string | null;
  mentorCertifications: string | null;
  mentorAvailabilityJson: unknown;
  mentorOnboardingComplete: boolean;
  linkedinUrl: string | null;
  bannerImageUrl?: string | null;
};

/** Avoid shipping huge base64 avatars on the `/mentors` grid (cards use a placeholder instead). */
export const MAX_AVATAR_DATA_URL_CHARS = 16_000;

/** Drop oversized `data:` blobs before JSON APIs or client props (keeps payloads small). */
export function trimLargeDataUrlField(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (v.startsWith("data:") && v.length > MAX_AVATAR_DATA_URL_CHARS) return null;
  return v;
}

function displayName(name: string | null, email: string | null): string {
  const n = name?.trim();
  if (n) return n;
  const local = email?.split("@")[0]?.trim();
  return local || "Mentor";
}

function formatRoleLine(title: string | null, company: string | null): string {
  const t = title?.trim();
  const c = company?.trim();
  if (t && c) return `${t}, ${c}`;
  return t || c || "Mentor";
}

function expertiseTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function heroImage(image: string | null | undefined): string {
  const u = image?.trim();
  if (u) return u;
  return MENTOR_PAGE_HERO_ASSETS.mentorPhoto;
}

function hasRealProfilePhoto(image: string | null | undefined): boolean {
  return Boolean(image?.trim());
}

function buildExperienceLines(u: MentorRow): string[] {
  const bullets: string[] = [];
  const title = u.mentorTitle?.trim();
  const company = u.mentorCompany?.trim();
  const years =
    normalizeMentorYearsBand(u.mentorYearsExperience) || u.mentorYearsExperience?.trim() || "";
  const line = [title, company].filter(Boolean).join(", ");
  if (line && years) bullets.push(`${line} (${years})`);
  else if (line) bullets.push(line);
  if (u.mentorCertifications?.trim()) {
    for (const part of u.mentorCertifications.split(/[;\n]/)) {
      const s = part.trim();
      if (s) bullets.push(s);
    }
  }
  const focus = u.mentorMentorshipFocus?.trim();
  if (focus && !bullets.some((b) => b.includes(focus.slice(0, 40)))) {
    bullets.push(focus);
  }
  if (u.bio?.trim() && bullets.length === 0) {
    bullets.push(u.bio.trim());
  }
  return bullets;
}

function buildSummary(u: MentorRow): string {
  const focus = u.mentorMentorshipFocus?.trim();
  if (focus) return focus;
  const bio = u.bio?.trim();
  if (bio) return bio;
  return "";
}

function mapRowToMentor(
  u: MentorRow,
  opts?: { /** Profile page: keep large data-URL avatars; list/grid strips them to save cache size. */
    allowLargeDataUrlAvatar?: boolean },
): Mentor {
  const rawImg = u.image?.trim() ?? "";
  const listSafeImg =
    opts?.allowLargeDataUrlAvatar || !rawImg.startsWith("data:") || rawImg.length <= MAX_AVATAR_DATA_URL_CHARS
      ? rawImg
      : "";
  const tags = expertiseTags(u.mentorExpertise);
  const slot = formatNextAvailableSlotLine(u.mentorAvailabilityJson);
  const photo = hasRealProfilePhoto(listSafeImg || null);
  return {
    id: u.id,
    name: displayName(u.name, u.email),
    role: formatRoleLine(u.mentorTitle, u.mentorCompany),
    tags,
    slot,
    image: heroImage(listSafeImg || null),
    hasProfilePhoto: photo,
    linkedUserId: u.id,
    summary: buildSummary(u),
    experienceLines: buildExperienceLines(u),
    linkedinUrl: u.linkedinUrl?.trim() || null,
    certifications: u.mentorCertifications?.trim() || null,
    bannerImageUrl: u.bannerImageUrl?.trim() || null,
    onboardingComplete: u.mentorOnboardingComplete,
    yearsExperience:
      normalizeMentorYearsBand(u.mentorYearsExperience) || u.mentorYearsExperience?.trim() || null,
  };
}

async function fetchPublicMentorsFromDb(): Promise<Mentor[]> {
  const rows = await prisma.user.findMany({
    where: { role: "mentor" },
    orderBy: [{ mentorOnboardingComplete: "desc" }, { name: "asc" }],
    select: mentorSelectDirectory,
  });
  return rows.map((u) => mapRowToMentor({ ...(u as MentorRow), bannerImageUrl: null }));
}

/** Cached in Redis (not Next data cache) so large mentor sets stay under Next’s 2MB limit. */
export async function getPublicMentors(): Promise<Mentor[]> {
  const key = CacheKeys.publicMentorsList();
  const t0 = Date.now();
  const list = await withJsonCache(key, CacheTtl.publicMentorsList, fetchPublicMentorsFromDb);
  if (process.env.NODE_ENV === "development") {
    console.info(`[perf] getPublicMentors ${Date.now() - t0}ms (${list.length} mentors)`);
  }
  return list;
}

export async function getPublicMentorById(id: string): Promise<Mentor | null> {
  const u = await prisma.user.findFirst({
    where: { id, role: "mentor" },
    select: mentorSelectFull,
  });
  if (!u) return null;
  return mapRowToMentor(u as MentorRow, { allowLargeDataUrlAvatar: true });
}

/**
 * Suggest mentors overlapping the current profile’s expertise and (when logged in as a student)
 * the viewer’s stated interests, software, and major — not a random slice.
 */
export async function getSimilarMentorsForProfile(
  excludeId: string,
  anchor: Mentor,
  studentUserId: string | undefined,
  take = 8,
): Promise<Mentor[]> {
  const rows = await prisma.user.findMany({
    where: { role: "mentor", NOT: { id: excludeId } },
    orderBy: [{ mentorOnboardingComplete: "desc" }, { name: "asc" }],
    select: mentorSelectDirectory,
  });
  const list = rows.map((u) => mapRowToMentor({ ...(u as MentorRow), bannerImageUrl: null }));

  const studentPhrases: string[] = [];
  if (studentUserId) {
    const s = await prisma.user.findFirst({
      where: { id: studentUserId, role: "student" },
      select: { interests: true, otherInterests: true, major: true, softwareSkills: true },
    });
    if (s) {
      if (Array.isArray(s.interests)) {
        for (const x of s.interests) {
          if (typeof x === "string" && x.trim()) studentPhrases.push(x.trim().toLowerCase());
        }
      }
      if (s.otherInterests?.trim()) {
        for (const w of s.otherInterests.toLowerCase().split(/[\s,;]+/).filter((x) => x.length > 2)) {
          studentPhrases.push(w);
        }
      }
      if (s.major?.trim()) studentPhrases.push(s.major.trim().toLowerCase());
      if (s.softwareSkills?.trim()) {
        for (const seg of s.softwareSkills
          .split(",")
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean)) {
          studentPhrases.push(seg);
        }
      }
    }
  }
  const studentSet = [...new Set(studentPhrases)];

  const anchorHay = [...anchor.tags, anchor.summary, ...anchor.experienceLines, anchor.role].join(" ").toLowerCase();
  const anchorWords = new Set(anchorHay.split(/\s+/).filter((w) => w.length > 4));

  function haystack(m: Mentor): string {
    return [
      m.name,
      m.role,
      m.summary,
      ...m.tags,
      ...m.experienceLines,
      m.certifications ?? "",
      m.slot,
      m.linkedinUrl ?? "",
    ]
      .join(" \n ")
      .toLowerCase();
  }

  function score(m: Mentor): number {
    let sc = 0;
    const hay = haystack(m);
    for (const ph of studentSet) {
      if (ph.length >= 3 && hay.includes(ph)) sc += 5;
    }
    for (const t of m.tags) {
      const tl = t.toLowerCase();
      if (anchor.tags.some((at) => at.toLowerCase() === tl)) sc += 6;
      for (const ph of studentSet) {
        if (ph.length >= 3 && (tl.includes(ph) || ph.includes(tl))) sc += 3;
      }
    }
    for (const at of anchor.tags) {
      const al = at.toLowerCase();
      if (al.length >= 3 && hay.includes(al)) sc += 3;
    }
    for (const w of anchorWords) {
      if (hay.includes(w)) sc += 1;
    }
    return sc;
  }

  list.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
  return list.slice(0, take);
}

/** @deprecated Prefer {@link getSimilarMentorsForProfile} for profile pages. */
export async function getSimilarMentorsForPublic(excludeId: string, take = 6): Promise<Mentor[]> {
  const anchor = (await getPublicMentorById(excludeId)) ?? null;
  if (!anchor) {
    const rows = await prisma.user.findMany({
      where: { role: "mentor", NOT: { id: excludeId } },
      orderBy: [{ mentorOnboardingComplete: "desc" }, { name: "asc" }],
      take,
      select: mentorSelectDirectory,
    });
    return rows.map((u) => mapRowToMentor({ ...(u as MentorRow), bannerImageUrl: null }));
  }
  return getSimilarMentorsForProfile(excludeId, anchor, undefined, take);
}
