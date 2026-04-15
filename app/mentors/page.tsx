import type { Metadata } from "next";

import { MentorsPage } from "@/components/mentors/MentorsPage";
import { getPublicMentors } from "@/lib/mentor-directory";

export const metadata: Metadata = {
  title: { absolute: "Mentors" },
};

/** ISR fallback; list data is cached in `getPublicMentors` (Redis) + invalidation on mentor updates. */
export const revalidate = 60;

export default async function MentorsRoute() {
  const mentors = await getPublicMentors();
  return <MentorsPage mentors={mentors} />;
}
