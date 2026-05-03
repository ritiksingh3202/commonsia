import { redirect } from "next/navigation";

import { cachedAuth, cachedMentorSetupUser } from "@/lib/request-cache";

export default async function MentorSetupLayout({ children }: { children: React.ReactNode }) {
  const session = await cachedAuth();
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent("/mentor")}`);
  }

  const user = await cachedMentorSetupUser(session.user.id);
  if (!user) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent("/mentor")}`);
  }
  if (user.role === "student") {
    redirect("/student");
  }
  if (user.mentorOnboardingComplete) {
    redirect("/mentor");
  }

  return <>{children}</>;
}
