import { prisma } from "@/lib/prisma";

/**
 * Read/write Google Calendar refresh token via raw SQL so the app keeps working
 * if `prisma generate` hasn’t been run yet after adding the column (stale client).
 * After regenerating the client, you can optionally switch back to `prisma.user` selects/updates.
 */
export async function getGoogleCalendarRefreshToken(userId: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<Array<{ googleCalendarRefreshToken: string | null }>>`
    SELECT "googleCalendarRefreshToken" FROM "User" WHERE id = ${userId} LIMIT 1
  `;
  return rows[0]?.googleCalendarRefreshToken ?? null;
}

export async function setGoogleCalendarRefreshToken(userId: string, token: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "User" SET "googleCalendarRefreshToken" = ${token} WHERE id = ${userId}
  `;
}
