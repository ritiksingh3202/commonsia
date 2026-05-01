import { randomBytes } from "crypto";
import type { Metadata } from "next";

import { auth } from "@/auth";
import { MentorsPage } from "@/components/mentors/MentorsPage";
import { getPublicMentors } from "@/lib/mentor-directory";
import {
  DIRECTORY_PAGE_SIZE,
  defaultMentorDirectoryFilters,
  runMentorDirectoryQuery,
} from "@/lib/mentors-directory-query";

export const metadata: Metadata = {
  title: { absolute: "Mentors" },
};

/**
 * ISR shell for `/mentors`: the mentor roster JSON still comes from Redis via `getPublicMentors()`
 * (often warm). Pagination + filtering fetch additional slices through `/api/mentors/directory`
 * so the browser never hydrates with dozens of full card payloads at once.
 */
export const revalidate = 60;

export default async function MentorsRoute() {
  const [mentors, session] = await Promise.all([getPublicMentors(), auth()]);
  /** New seed each full load so roster order differs on refresh (pagination stays stable via URL API `seed`). */
  const shuffleSeed = randomBytes(4).readUInt32BE(0);
  const filters = defaultMentorDirectoryFilters();
  const { mentors: slice, totalFiltered, totalAll } = runMentorDirectoryQuery(mentors, {
    ...filters,
    page: 1,
    pageSize: DIRECTORY_PAGE_SIZE,
    shuffleSeed,
  });

  return (
    <MentorsPage
      initialShuffleSeed={shuffleSeed}
      initialMentors={slice}
      initialTotalFiltered={totalFiltered}
      initialTotalAll={totalAll}
      viewerUserId={session?.user?.id ?? null}
    />
  );
}
