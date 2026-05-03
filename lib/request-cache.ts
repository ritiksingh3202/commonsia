import { cache } from "react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { mentorSetupUserSelect, studentSetupUserSelect } from "@/lib/setup-load-user";

/**
 * Per-request memoized auth() — layout and page share one JWT decode.
 * React.cache() resets between requests so there is no cross-request leakage.
 */
export const cachedAuth = cache(auth);

/**
 * Per-request memoized user fetch for mentor setup.
 * Includes all fields needed by both the layout guard and the step page,
 * so the two server components share a single Prisma round-trip.
 */
export const cachedMentorSetupUser = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...mentorSetupUserSelect,
      role: true,
      mentorOnboardingComplete: true,
      accounts: {
        where: { provider: "linkedin" },
        select: { provider: true },
        take: 1,
      },
    },
  });
});

/**
 * Per-request memoized user fetch for student setup.
 * Includes all fields needed by both the layout guard and the step page.
 */
export const cachedStudentSetupUser = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...studentSetupUserSelect,
      role: true,
      profileComplete: true,
      accounts: {
        where: { provider: "linkedin" },
        select: { provider: true },
      },
    },
  });
});
