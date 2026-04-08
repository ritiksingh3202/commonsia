import { prisma } from "@/lib/prisma";

/**
 * Who may view another user's portfolio document or external portfolio URL.
 * - Always allowed for the profile owner.
 * - Cross-role: mentor ↔ student only (not random users).
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

  if (viewerRole === "mentor" && target.role === "student") return true;
  if (viewerRole === "student" && target.role === "mentor") return true;
  return false;
}
