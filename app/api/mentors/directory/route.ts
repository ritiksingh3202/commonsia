import { NextResponse } from "next/server";

import { getPublicMentors } from "@/lib/mentor-directory";
import { parseMentorDirectoryQuery, runMentorDirectoryQuery } from "@/lib/mentors-directory-query";

export const runtime = "nodejs";

/**
 * Paginated mentor directory for `/mentors`. Keeps filter/search logic aligned with SSR via
 * {@link applyMentorDirectoryFilters}; only the requested page is serialized to the browser.
 */
export async function GET(req: Request) {
  let query;
  try {
    query = parseMentorDirectoryQuery(new URL(req.url).searchParams);
  } catch {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  try {
    const mentors = await getPublicMentors();
    const { mentors: slice, totalFiltered, totalAll } = runMentorDirectoryQuery(mentors, query);
    return NextResponse.json({
      mentors: slice,
      totalFiltered,
      totalAll,
      page: query.page,
      pageSize: query.pageSize,
    });
  } catch (err) {
    console.warn("[api/mentors/directory]", err);
    return NextResponse.json({ error: "Directory unavailable" }, { status: 503 });
  }
}
