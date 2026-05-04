import { PrismaClient } from "@prisma/client";

import { withConnectionRetry } from "@/lib/prisma-retry";

/**
 * Secondary Prisma client, pinned to `DIRECT_URL` (Supabase session pool on port 5432, no
 * pgbouncer).
 *
 * Relationship to the primary `prisma` client:
 *   - Primary (`lib/prisma.ts`) is pinned to `DATABASE_URL` (transaction pool, 6543, pgbouncer)
 *     which is what Supabase recommends for web apps and which multiplexes tens of requests
 *     across a handful of physical connections.
 *   - This `prismaDirect` is pinned to the OTHER pool so read-heavy public paths can fall back
 *     across pools. If the primary saturates briefly, the session pool still answers queries
 *     and the SSR render doesn't turn into an empty grid / 500.
 *
 * The session pool has far fewer slots, so this client keeps `connection_limit` tiny (see
 * `applyServerlessPoolDefaults` in `lib/db-url-env.ts`) and is only used for read-through
 * fallbacks (see mentor-directory / photo route / mentor-reviews / mentor-dashboard-stats).
 * Writes always stay on the primary client.
 */
const globalForDirect = globalThis as unknown as { prismaDirect: PrismaClient | undefined };

function buildFallbackClient(): PrismaClient {
  const fallback = (process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "").trim();
  if (!fallback) {
    return new PrismaClient();
  }
  return new PrismaClient({
    datasources: { db: { url: fallback } },
  });
}

const baseDirectClient: PrismaClient = globalForDirect.prismaDirect ?? buildFallbackClient();
globalForDirect.prismaDirect = baseDirectClient;

/** Same auto-retry on stale-connection errors as the primary client (see lib/prisma-retry.ts). */
export const prismaDirect: PrismaClient = withConnectionRetry(baseDirectClient);
