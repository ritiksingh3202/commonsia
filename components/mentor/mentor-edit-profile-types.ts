/** Server-passed snapshot for mentor profile edit (maps to Prisma `User`). */
export type MentorEditProfileInitial = {
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  mentorTitle: string | null;
  mentorCompany: string | null;
  mentorYearsExperience: string | null;
  mentorExpertise: unknown;
  mentorMentorshipFocus: string | null;
  mentorAvailabilityPref: string | null;
  mentorMaxMenteesPref: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  portfolioFileName: string | null;
  portfolioVisibleToOthers: boolean;
  mentorCertifications: string | null;
  softwareSkills: string | null;
};
