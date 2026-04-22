import { ensureDirectUrlForPrismaRuntime, warnDatabaseUrlMisconfigDevOnce } from "@/lib/db-url-env";
import { initSoftDeleteRuntimeSupport } from "@/lib/user-active";
import { PrismaClient } from "@prisma/client";

ensureDirectUrlForPrismaRuntime();
warnDatabaseUrlMisconfigDevOnce();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Prefer `DIRECT_URL` (Supabase session pool on port 5432) for runtime queries.
 *
 * Supabase's pgbouncer transaction pool (port 6543, pointed to by `DATABASE_URL`) was repeatedly
 * saturating — dev hot-reloads and long-lived connections leaked "idle in transaction" sessions
 * that pinned pool slots, so every subsequent query hit
 *   FATAL: Unable to check out connection from the pool due to timeout
 * and the site SSR blanked out. Routing through the session pooler gives us a separate, larger,
 * leak-resistant pool (Supabase now also auto-kills stuck `idle_in_transaction` sessions after
 * 60s — see migration `auto_kill_stuck_idle_transactions`).
 *
 * `DATABASE_URL` is still the default if `DIRECT_URL` is missing; migrations / PrismaAdapter
 * already use `directUrl` from `schema.prisma`, so behaviour stays identical.
 */
function buildRuntimeClient(): PrismaClient {
  const preferred = (process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "").trim();
  if (!preferred) return new PrismaClient();
  return new PrismaClient({ datasources: { db: { url: preferred } } });
}

/**
 * Reuse one `PrismaClient` per runtime isolate (dev + Vercel serverless). Omitting the global in
 * production caused extra client churn in some deployments; Prisma recommends a global singleton
 * for connection pooling / fewer "too many connections" flakes during auth.
 */
export const prisma = globalForPrisma.prisma ?? buildRuntimeClient();

initSoftDeleteRuntimeSupport(prisma);

globalForPrisma.prisma = prisma;
