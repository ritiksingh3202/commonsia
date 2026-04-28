import type { Prisma } from "@prisma/client";

/** Fields needed across mentor onboarding steps (server load once per request). */
export const mentorSetupUserSelect = {
  country: true,
  city: true,
  mentorTitle: true,
  mentorCompany: true,
  mentorYearsExperience: true,
  mentorExpertise: true,
  mentorMentorshipFocus: true,
  mentorAvailabilityPref: true,
  mentorMaxMenteesPref: true,
  bio: true,
  linkedinUrl: true,
  portfolioUrl: true,
  portfolioFileName: true,
  mentorCertifications: true,
  whatsappUrl: true,
} satisfies Prisma.UserSelect;

export type MentorSetupUserSnapshot = Prisma.UserGetPayload<{
  select: typeof mentorSetupUserSelect;
}>;

export const studentSetupUserSelect = {
  country: true,
  city: true,
  university: true,
  yearOfStudy: true,
  major: true,
  interests: true,
  softwareSkills: true,
  otherInterests: true,
  bio: true,
  portfolioUrl: true,
  /** Legacy — UI uses `whatsappUrl`; kept so pre-migration rows can pre-fill the field. */
  phone: true,
  whatsappUrl: true,
  linkedinUrl: true,
} satisfies Prisma.UserSelect;

export type StudentSetupUserSnapshot = Prisma.UserGetPayload<{
  select: typeof studentSetupUserSelect;
}>;

export function expertiseToStringList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string");
  }
  return [];
}

export function interestsToStringList(raw: unknown): string[] {
  return expertiseToStringList(raw);
}
