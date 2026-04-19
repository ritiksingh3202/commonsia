/** Human-readable total mentoring duration (minutes) for dashboards and public profile. */
export function formatMentoringMinutesLong(total: number): string {
  if (total <= 0) return "0 Minutes";
  if (total < 60) return `${total} Minute${total === 1 ? "" : "s"}`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (m === 0) return `${h} Hour${h === 1 ? "" : "s"}`;
  return `${h}h ${m}m`;
}
