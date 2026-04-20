import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Finished students use the dashboard / edit profile; keep the wizard for incomplete onboarding only.
 */
export default async function StudentSetupLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent("/student")}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, profileComplete: true },
  });

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
