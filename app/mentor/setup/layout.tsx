import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// #region agent log
const __dbg = (msg: string, data: Record<string, unknown> = {}, hyp = "") => {
  if (process.env.AUTH_DEBUG !== "1") return;
  try {
    console.error("[auth-flow]", JSON.stringify({ location: "mentor/setup/layout", message: msg, hyp, data }));
  } catch { /* ignore */ }
};
// #endregion

/**
 * If onboarding is finished, skip setup screens (users will use edit profile later).
 * Unauthenticated visitors are sent to login with `callbackUrl=/mentor` so post-OAuth `/auth/continue` can resume.
 */
export default async function MentorSetupLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // #region agent log
  __dbg("entered mentor/setup layout", { hasSession: Boolean(session?.user?.id), userIdTail: session?.user?.id?.slice(-6) ?? null }, "H1_H2_H3");
  // #endregion
  if (!session?.user?.id) {
    // #region agent log
    __dbg("no session -> redirect to login", {}, "H3");
    // #endregion
    redirect(`/auth/login?callbackUrl=${encodeURIComponent("/mentor")}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, mentorOnboardingComplete: true },
  });

  // #region agent log
  __dbg("mentor setup: loaded user", { userFound: Boolean(user), role: user?.role ?? null, mentorOnboardingComplete: user?.mentorOnboardingComplete ?? null }, "H1_H2");
  // #endregion

  if (!user) {
    // #region agent log
    __dbg("user row missing -> login", {}, "H3");
    // #endregion
    redirect(`/auth/login?callbackUrl=${encodeURIComponent("/mentor")}`);
  }
  if (user.role === "student") {
    // #region agent log
    __dbg("role=student -> bouncing away from mentor setup", {}, "H1");
    // #endregion
    redirect("/student");
  }

  if (user.mentorOnboardingComplete) {
    // #region agent log
    __dbg("mentorOnboardingComplete=true -> /mentor", {}, "H2");
    // #endregion
    redirect("/mentor");
  }

  // #region agent log
  __dbg("rendering mentor setup children", { role: user.role }, "ok");
  // #endregion
  return <>{children}</>;
}
