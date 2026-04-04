/**
 * Returns the next setup URL mentors must complete, or null if onboarding is done.
 */
export function getMentorOnboardingRedirectPath(user: {
  mentorTitle: string | null;
  mentorMentorshipFocus: string | null;
  bio: string | null;
  mentorOnboardingComplete: boolean;
}): string | null {
  if (user.mentorOnboardingComplete) return null;
  if (!user.mentorTitle?.trim()) return "/mentor/setup/1";
  if (!user.mentorMentorshipFocus?.trim()) return "/mentor/setup/2";
  if (!user.bio?.trim()) return "/mentor/setup/3";
  return "/mentor/availability";
}
