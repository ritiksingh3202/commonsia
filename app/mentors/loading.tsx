import { MentorsPageSkeleton } from "@/components/mentors/MentorsPageSkeleton";

/** Instant shell while the mentor list RSC resolves — navbar/footer come from `mentors/layout`. */
export default function MentorsLoading() {
  return <MentorsPageSkeleton />;
}
