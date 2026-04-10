import type { User } from "@prisma/client";

/** Serializable user slice for the student dashboard (from server) */
export type StudentProfileUser = Pick<
  User,
  | "id"
  | "name"
  | "email"
  | "phone"
  | "image"
  | "university"
  | "yearOfStudy"
  | "major"
  | "interests"
  | "otherInterests"
  | "softwareSkills"
  | "bio"
  | "bannerImageUrl"
  | "whatsappUrl"
  | "linkedinUrl"
  | "instagramUrl"
  | "portfolioUrl"
  | "portfolioFileName"
  | "portfolioFileDataUrl"
  | "portfolioVisibleToOthers"
>;

export function parseInterests(interests: unknown): string[] {
  if (Array.isArray(interests) && interests.every((x) => typeof x === "string")) {
    return interests as string[];
  }
  return [];
}

export function formatStudentSubtitle(u: Pick<User, "major" | "yearOfStudy" | "university">): string {
  const bits: string[] = [];
  if (u.major?.trim()) bits.push(u.major.trim());
  if (u.yearOfStudy?.trim()) bits.push(u.yearOfStudy.trim());
  const head = bits.join(" ");
  if (u.university?.trim()) {
    return head ? `${head}, ${u.university.trim()}` : u.university.trim();
  }
  return head || "Student";
}

/** Strip internal `Other: detail` encoding so profiles show e.g. "AutoCAD" not "Other: AutoCAD". */
function displaySoftwareToken(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(/^Other:\s*(.*)$/i);
  if (m) {
    const rest = m[1]?.trim() ?? "";
    return rest || null;
  }
  if (t === "Other") return null;
  return t;
}

export function parseSoftwarePills(softwareSkills: string | null): string[] {
  if (!softwareSkills?.trim()) return [];
  const out: string[] = [];
  for (const part of softwareSkills.split(/[,，]/)) {
    const label = displaySoftwareToken(part);
    if (label) out.push(label);
  }
  return out;
}
