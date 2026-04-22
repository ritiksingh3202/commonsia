import { prisma } from "@/lib/prisma";

/**
 * Who may view another user's portfolio document or external portfolio URL.
 * - Always allowed for the profile owner.
 * - Any authenticated mentor or student may view a mentor/student portfolio when the owner
 *   has `portfolioVisibleToOthers = true`. Previously this was restricted to cross-role pairs
 *   only, which meant a mentor browsing another mentor's public profile saw a broken "Open
 *   portfolio document" button (API returned 403 → blank/error tab). Owners still control
 *   visibility via the single toggle on their profile.
 */
export async function canViewOthersPortfolio(params: {
  viewerId: string;
  viewerRole: string | null;
  targetUserId: string;
}): Promise<boolean> {
  const { viewerId, viewerRole, targetUserId } = params;
  if (viewerId === targetUserId) return true;
  if (viewerRole !== "mentor" && viewerRole !== "student") return false;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { role: true, portfolioVisibleToOthers: true },
  });
  if (!target) return false;
  if (target.portfolioVisibleToOthers === false) return false;

  return target.role === "mentor" || target.role === "student";
}
