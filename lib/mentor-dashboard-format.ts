export function formatRelativePast(when: Date | string): string {
  const d = when instanceof Date ? when : new Date(when);
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 45) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hour${Math.floor(sec / 3600) === 1 ? "" : "s"} ago`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)} day${Math.floor(sec / 86400) === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function sessionBadge(startAt: Date | string): { label: string; className: string } {
  const now = new Date();
  const d = startAt instanceof Date ? startAt : new Date(startAt);
  d.setHours(0, 0, 0, 0);
  const t = new Date(now);
  t.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (diffDays === 0) return { label: "Today", className: "bg-primary/15 text-primary" };
  if (diffDays === 1) return { label: "Tomorrow", className: "bg-orange-50 text-orange-700" };
  return {
    label: d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    className: "bg-primary/10 text-primary",
  };
}

export function formatSessionBadge(startAt: Date | string): { label: string; className: string } {
  return sessionBadge(startAt);
}

