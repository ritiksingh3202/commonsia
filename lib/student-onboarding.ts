import { INTEREST_OTHERS_LABEL } from "@/components/student/student-setup-constants";
import { interestsToStringList } from "@/lib/setup-load-user";

function studentInterestsStepSatisfied(interests: unknown, otherInterests: string | null): boolean {
  const list = interestsToStringList(interests);
  if (list.length === 0) return false;
  if (list.includes(INTEREST_OTHERS_LABEL) && !otherInterests?.trim()) return false;
  return true;
}

function studentSoftwareStepSatisfied(softwareSkills: string | null): boolean {
  return !!softwareSkills?.trim();
}

/**
 * Next student setup URL, or null if onboarding is finished (`profileComplete`).
 */
export function getStudentOnboardingRedirectPath(user: {
  profileComplete: boolean;
  university: string | null;
  yearOfStudy: string | null;
  major: string | null;
  phone: string | null;
  interests: unknown;
  otherInterests: string | null;
  softwareSkills: string | null;
}): string | null {
  if (user.profileComplete) return null;
  if (
    !user.university?.trim() ||
    !user.yearOfStudy?.trim() ||
    !user.major?.trim() ||
    !user.phone?.trim()
  ) {
    return "/student/setup/1";
  }
  if (!studentInterestsStepSatisfied(user.interests, user.otherInterests)) {
    return "/student/setup/2";
  }
  if (!studentSoftwareStepSatisfied(user.softwareSkills)) {
    return "/student/setup/2";
  }
  return "/student/setup/3";
}
