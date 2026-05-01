/** Schedule URL for a mentor card — signed-out users go through login with callback. */
export function mentorScheduleHref(mentorUserId: string, viewerUserId: string | null | undefined): string {
  const scheduleTarget = `/schedule?mentorUserId=${encodeURIComponent(mentorUserId)}`;
  return viewerUserId ? scheduleTarget : `/auth/login?callbackUrl=${encodeURIComponent(scheduleTarget)}`;
}
