import { PrismaClient } from "@prisma/client";

/**
 * Secondary Prisma client pinned to `DIRECT_URL` (Supabase session pooler on port 5432, no pgbouncer).
 *
 * Purpose: guarantee a working connection path for *read-only public queries* (`/mentors` grid,
 * public profile pages) even when the primary transaction pooler (port 6543) is exhausted or
 * temporarily rejecting new connections. The session pooler has its own pool, separate from
 * pgbouncer's transaction pool, so a saturation event on one rarely affects the other.
 *
 * It is intentionally NOT exposed for writes. Migrations and mutations still flow through the
 * shared `prisma` client so we don't widen the write footprint beyond what Auth.js needs.
 */
const globalForDirect = globalThis as unknown as { prismaDirect: PrismaClient | undefined };

function buildDirectClient(): PrismaClient {
  const direct = (process.env.DIRECT_URL ?? "").trim();
  if (!direct) {
    /** Fall back to the default client config if DIRECT_URL isn't set — caller should also handle errors. */
    return new PrismaClient();
  }
  return new PrismaClient({
    datasources: { db: { url: direct } },
  });
}

export const prismaDirect: PrismaClient = globalForDirect.prismaDirect ?? buildDirectClient();
globalForDirect.prismaDirect = prismaDirect;
