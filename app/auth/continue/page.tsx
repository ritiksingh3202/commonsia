import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getMentorOnboardingRedirectPath } from "@/lib/mentor-onboarding";
import { prisma } from "@/lib/prisma";
import { getStudentOnboardingRedirectPath } from "@/lib/student-onboarding";

export const dynamic = "force-dynamic";

// #region agent log
const __dbg = (msg: string, data: Record<string, unknown> = {}, hyp = "") => {
  if (process.env.AUTH_DEBUG !== "1") return;
  try {
    console.error("[auth-flow]", JSON.stringify({ location: "auth/continue", message: msg, hyp, data }));
  } catch { /* ignore */ }
};
// #endregion

function safeNextPath(raw: string | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

/**
 * After sign-in, sends users to onboarding when needed, otherwise to `next` or role home.
 */
export default async function AuthContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextRaw } = await searchParams;
  const next = safeNextPath(nextRaw);
  const resumeContinue =
    next != null ? `/auth/continue?next=${encodeURIComponent(next)}` : "/auth/continue";

  const session = await auth();
  // #region agent log
  __dbg("entered /auth/continue", { nextRaw, nextSafe: next, hasSession: Boolean(session?.user?.id), userIdTail: session?.user?.id?.slice(-6) ?? null }, "H3_H4");
  // #endregion
  if (!session?.user?.id?.trim()) {
    // #region agent log
    __dbg("no session -> redirect to /auth/login", { resumeContinue }, "H3");
    // #endregion
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(resumeContinue)}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      profileComplete: true,
      university: true,
      yearOfStudy: true,
      major: true,
      phone: true,
      interests: true,
      otherInterests: true,
      softwareSkills: true,
      bio: true,
      mentorTitle: true,
      mentorCompany: true,
      mentorYearsExperience: true,
      mentorExpertise: true,
      mentorMentorshipFocus: true,
      linkedinUrl: true,
      whatsappUrl: true,
      mentorOnboardingComplete: true,
    },
  });

  // #region agent log
  __dbg("loaded user row", { userFound: Boolean(user), role: user?.role ?? null, profileComplete: user?.profileComplete ?? null, mentorOnboardingComplete: user?.mentorOnboardingComplete ?? null }, "H1_H2_H4");
  // #endregion

  if (!user) {
    // #region agent log
    __dbg("user row missing -> redirect to login", { resumeContinue }, "H3");
    // #endregion
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(resumeContinue)}`);
  }

  /**
   * OAuth users have no `role` until setup or `MergeSignupDraft` saves. If we redirected them back
   * to `/auth` here, they would land on the Choose-Role signup page even though the navbar shows
   * "My profile" — the exact loop reported for sign-in with Google/LinkedIn. Instead:
   *   1. Honor an explicit `next` (works for Signup → `/student/setup/1` etc.).
   *   2. Else infer role from existing mentor-onboarding hints on the account.
   *   3. Otherwise default to the student onboarding wizard — it lets users pick their path
   *      without another full "sign up" screen.
   */
  if (!user.role) {
    if (next?.startsWith("/student") || next?.startsWith("/mentor")) {
      // #region agent log
      __dbg("role=null, honoring next path", { next }, "H4");
      // #endregion
      redirect(next);
    }
    const looksLikeMentor =
      Boolean(user.mentorOnboardingComplete) ||
      Boolean(user.mentorTitle?.trim()) ||
      Boolean(user.mentorCompany?.trim()) ||
      (Array.isArray(user.mentorExpertise) && user.mentorExpertise.length > 0);
    const target = looksLikeMentor ? "/mentor/setup/1" : "/student/setup/1";
    // #region agent log
    __dbg("role=null, inferred", { looksLikeMentor, target }, "H4");
    // #endregion
    redirect(target);
  }

  if (user.role === "mentor") {
    const onboarding = getMentorOnboardingRedirectPath({
      mentorOnboardingComplete: user.mentorOnboardingComplete,
      mentorTitle: user.mentorTitle,
      mentorCompany: user.mentorCompany,
      mentorYearsExperience: user.mentorYearsExperience,
      mentorExpertise: user.mentorExpertise,
      mentorMentorshipFocus: user.mentorMentorshipFocus,
      bio: user.bio,
      linkedinUrl: user.linkedinUrl,
      whatsappUrl: user.whatsappUrl,
    });
    // #region agent log
    __dbg("role=mentor, redirect decision", { onboarding, next }, "H1_H2");
    // #endregion
    if (onboarding) redirect(onboarding);
    if (next) redirect(next);
    redirect("/mentor");
  }

  if (user.role === "student") {
    const onboarding = getStudentOnboardingRedirectPath({
      profileComplete: user.profileComplete,
      university: user.university,
      yearOfStudy: user.yearOfStudy,
      major: user.major,
      phone: user.phone,
      interests: user.interests,
      otherInterests: user.otherInterests,
      softwareSkills: user.softwareSkills,
    });
    // #region agent log
    __dbg("role=student, redirect decision", { onboarding, next }, "H1");
    // #endregion
    if (onboarding) redirect(onboarding);
    if (next) redirect(next);
    redirect("/student");
  }

  // #region agent log
  __dbg("no role branch matched -> fallback", { next, role: user.role }, "H4");
  // #endregion
  if (next) redirect(next);
  redirect("/");
}
