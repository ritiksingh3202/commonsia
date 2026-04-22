import { PrismaClient } from "@prisma/client";

/**
 * Secondary Prisma client, pinned to `DATABASE_URL` (Supabase transaction pooler on port 6543
 * with pgbouncer).
 *
 * Relationship to the primary `prisma` client:
 *   - Primary (`lib/prisma.ts`) is now pinned to `DIRECT_URL` (session pool, 5432).
 *   - This `prismaDirect` is pinned to the OTHER pool so read-heavy public paths can fall back
 *     across pools. If one pool saturates (leaked idle-in-transaction, flood, etc.), the
 *     other still answers queries and the SSR render doesn't turn into an empty grid / 500.
 *
 * Used only for read-through fallbacks (see mentor-directory / photo route / mentor-reviews /
 * mentor-dashboard-stats). Writes stay on the primary client.
 */
const globalForDirect = globalThis as unknown as { prismaDirect: PrismaClient | undefined };

function buildFallbackClient(): PrismaClient {
  const fallback = (process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? "").trim();
  if (!fallback) {
    return new PrismaClient();
  }
  return new PrismaClient({
    datasources: { db: { url: fallback } },
  });
}

export const prismaDirect: PrismaClient = globalForDirect.prismaDirect ?? buildFallbackClient();
globalForDirect.prismaDirect = prismaDirect;
