/** Tags for `unstable_cache` / `revalidateTag` — keep in sync with invalidation call sites. */
export const CACHE_TAG_HOME_TESTIMONIALS = "home-testimonials";

export function mentorReviewsTag(mentorUserId: string) {
  return `mentor-reviews-${mentorUserId}`;
}
