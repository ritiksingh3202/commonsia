import type { Metadata } from "next";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { MentorsPage } from "@/components/mentors/MentorsPage";
import { getPublicMentors } from "@/lib/mentor-directory";

export const metadata: Metadata = {
  title: { absolute: "Mentors" },
};

/** Always load mentor list from the database (no stale static cache). */
export const dynamic = "force-dynamic";

export default async function MentorsRoute() {
  const mentors = await getPublicMentors();
  return (
    <MarketingShell>
      <MentorsPage mentors={mentors} />
    </MarketingShell>
  );
}
