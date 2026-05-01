import { LEGACY_MENTOR_EXPERTISE_MAP } from "@/components/shared/architecture-taxonomy";
import type { Mentor } from "@/lib/mentor-directory";

/** Grouped synonyms: if the user query touches one phrase, we also match the rest (e.g. sustainability ↔ green building). */
const SYNONYM_CLUSTERS: string[][] = [
  [
    "sustainable",
    "sustainability",
    "sustainable design",
    "green building",
    "leed",
    "griha",
    "climate responsive",
    "climate-responsive",
    "net zero",
    "net-zero",
    "carbon neutral",
    "eco-friendly",
    "environmental design",
    "passive design",
  ],
  ["parametric", "computational design", "grasshopper", "generative", "algorithmic design", "dynamo", "rhino"],
  ["urban design", "urban planning", "city planning", "regional planning"],
  ["interior design", "interior architecture", "interiors"],
  ["landscape architecture", "landscape design", "landscaping"],
  ["bim", "building information", "revit", "archicad"],
  ["portfolio", "crit", "design review", "pin up"],
  ["internship", "placement", "job guidance", "career"],
];

/** Combined searchable text for a mentor (public fields). */
export function mentorSearchHaystack(m: Mentor): string {
  return [
    m.name,
    m.role,
    m.city ?? "",
    m.country ?? "",
    m.summary,
    m.bio ?? "",
    ...m.tags,
    ...m.experienceLines,
    m.certifications ?? "",
    m.availabilityPattern,
    m.slot,
    m.linkedinUrl ?? "",
  ]
    .join(" \n ")
    .toLowerCase();
}

/** Search needles: raw query plus expanded synonym phrases when relevant. */
export function searchNeedlesFromQuery(raw: string): string[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  const needles = new Set<string>([q]);
  if (q.length >= 3) {
    for (const cluster of SYNONYM_CLUSTERS) {
      if (cluster.some((c) => q.includes(c) || (c.length <= 32 && c.includes(q)))) {
        for (const c of cluster) needles.add(c);
      }
    }
  }
  return [...needles].filter((n) => n.length >= 2);
}

export function mentorMatchesSearchExpanded(m: Mentor, query: string): boolean {
  const needles = searchNeedlesFromQuery(query);
  if (needles.length === 0) return true;
  const hay = mentorSearchHaystack(m);
  return needles.some((n) => hay.includes(n));
}

/**
 * Same preset labels as student profile “areas of interest” (`ARCHITECTURE_FLAT_INTERESTS`).
 * OR semantics: mentor matches if any selected label appears in tags or profile text.
 */
export function mentorMatchesSelectedInterests(m: Mentor, selectedLabels: ReadonlySet<string>): boolean {
  if (selectedLabels.size === 0) return true;
  const hay = mentorSearchHaystack(m);
  const normalizedTagLower = m.tags.map((t) =>
    (LEGACY_MENTOR_EXPERTISE_MAP[t] ?? t).trim().toLowerCase(),
  );
  for (const label of selectedLabels) {
    const raw = label.trim();
    if (!raw) continue;
    const low = raw.toLowerCase();
    if (normalizedTagLower.some((t) => t === low)) return true;
    if (hay.includes(low)) return true;
  }
  return false;
}

function normalizeCountryToken(country: string | null | undefined): string {
  return (country ?? "").trim().toLowerCase();
}

/** Mentor saved “India” as their profile country (matches setup combobox label). */
export function mentorCountryIsIndia(country: string | null | undefined): boolean {
  const n = normalizeCountryToken(country);
  if (!n) return false;
  return n === "india";
}

/**
 * India filter: mentors based in India, **or** country not filled yet (still discoverable domestically).
 */
export function mentorMatchesIndiaFilter(m: Mentor): boolean {
  const n = normalizeCountryToken(m.country);
  if (!n) return true;
  return mentorCountryIsIndia(m.country);
}

/**
 * Abroad filter: mentors who **saved a profile country that is not India** (explicit non-India location).
 */
export function mentorMatchesAbroadFilter(m: Mentor): boolean {
  const n = normalizeCountryToken(m.country);
  if (!n) return false;
  return !mentorCountryIsIndia(m.country);
}

export type ExperienceLevelFilter = "" | "0-3" | "3-7" | "7+";

const Y0_2 = "0–2 years";
const Y2_5 = "2–5 years";
/** @deprecated Stored label; still match for filters until data is migrated. */
const Y3_5_LEGACY = "3–5 years";
const Y6_10 = "6–10 years";
const Y10 = "10+ years";

export function mentorMatchesExperienceLevel(m: Mentor, filter: ExperienceLevelFilter): boolean {
  if (!filter) return true;
  const y = m.yearsExperience?.trim() ?? "";

  if (filter === "0-3") {
    return y === Y0_2 || y === Y2_5 || y === Y3_5_LEGACY;
  }
  if (filter === "3-7") {
    return y === Y2_5 || y === Y3_5_LEGACY || y === Y6_10;
  }
  if (filter === "7+") {
    return y === Y6_10 || y === Y10;
  }
  return true;
}

export type LocationFilter = "" | "india" | "abroad";

export function mentorMatchesLocation(m: Mentor, filter: LocationFilter): boolean {
  if (!filter) return true;
  if (filter === "india") return mentorMatchesIndiaFilter(m);
  return mentorMatchesAbroadFilter(m);
}
