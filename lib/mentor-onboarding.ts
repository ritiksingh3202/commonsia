import { expertiseToStringList } from "@/lib/setup-load-user";

/**
 * Returns the next setup URL mentors must complete, or null if onboarding is done.
 */
export function getMentorOnboardingRedirectPath(user: {
  mentorTitle: string | null;
  mentorCompany: string | null;
  mentorYearsExperience: string | null;
  mentorExpertise: unknown;
  mentorMentorshipFocus: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  whatsappUrl: string | null;
  mentorOnboardingComplete: boolean;
}): string | null {
  if (user.mentorOnboardingComplete) return null;
  if (!user.mentorTitle?.trim()) return "/mentor/setup/1";
  if (!user.mentorCompany?.trim() || !user.mentorYearsExperience?.trim()) return "/mentor/setup/1";
  if (expertiseToStringList(user.mentorExpertise).length === 0) return "/mentor/setup/1";
  if (!user.mentorMentorshipFocus?.trim()) return "/mentor/setup/2";
  if (!user.bio?.trim() || !user.linkedinUrl?.trim() || !user.whatsappUrl?.trim()) return "/mentor/setup/3";
  return "/mentor/availability";
}
