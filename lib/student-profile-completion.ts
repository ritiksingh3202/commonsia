import { INTEREST_OTHERS_LABEL } from "@/components/student/student-setup-constants";
import { interestsToStringList } from "@/lib/setup-load-user";

function interestsOk(interests: unknown, otherInterests: string | null): boolean {
  const list = interestsToStringList(interests);
  if (list.length === 0) return false;
  if (list.includes(INTEREST_OTHERS_LABEL) && !otherInterests?.trim()) return false;
  return true;
}

/**
 * 0–100 for dashboard. When `profileComplete` is true, always 100.
 */
export function computeStudentProfileCompletionPercent(user: {
  profileComplete: boolean;
  university: string | null;
  yearOfStudy: string | null;
  major: string | null;
  phone: string | null;
  interests: unknown;
  otherInterests: string | null;
  softwareSkills: string | null;
  bio: string | null;
  linkedinUrl: string | null;
}): number {
  if (user.profileComplete) return 100;

  const checks = [
    Boolean(user.university?.trim()),
    Boolean(user.yearOfStudy?.trim()),
    Boolean(user.major?.trim()),
    Boolean(user.phone?.trim()),
    interestsOk(user.interests, user.otherInterests),
    Boolean(user.softwareSkills?.trim()),
    Boolean(user.bio?.trim()),
    Boolean(user.linkedinUrl?.trim()),
  ];
  const done = checks.filter(Boolean).length;
  return Math.min(99, Math.round((done / checks.length) * 100));
}
