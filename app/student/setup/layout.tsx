import { redirect } from "next/navigation";

import { cachedAuth, cachedStudentSetupUser } from "@/lib/request-cache";

export default async function StudentSetupLayout({ children }: { children: React.ReactNode }) {
  const session = await cachedAuth();
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent("/student")}`);
  }

  const user = await cachedStudentSetupUser(session.user.id);
  if (!user) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent("/student")}`);
  }
  if (user.role === "mentor") {
    redirect("/mentor/setup/1");
  }
  if (user.profileComplete) {
    redirect("/student");
  }

  return <>{children}</>;
}
