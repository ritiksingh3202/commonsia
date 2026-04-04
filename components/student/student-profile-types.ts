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

export function parseSoftwarePills(softwareSkills: string | null): string[] {
  if (!softwareSkills?.trim()) return [];
  return softwareSkills
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
