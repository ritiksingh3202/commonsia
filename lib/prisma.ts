import { ensureDirectUrlForPrismaRuntime, warnDatabaseUrlMisconfigDevOnce } from "@/lib/db-url-env";
import { initSoftDeleteRuntimeSupport } from "@/lib/user-active";
import { PrismaClient } from "@prisma/client";

ensureDirectUrlForPrismaRuntime();
warnDatabaseUrlMisconfigDevOnce();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Use `DATABASE_URL` (Supabase transaction pool on port 6543 with pgbouncer) for runtime queries.
 *
 * This pool is purpose-built for web apps: pgbouncer multiplexes many short queries across a small
 * number of physical Postgres connections, so saturation is rare as long as Prisma's
 * `connection_limit` is tuned (see `applyServerlessPoolDefaults` in `lib/db-url-env.ts`).
 *
 * Supabase's session pool (port 5432 / `DIRECT_URL`) has far fewer slots (~15 on free/pro) and
 * holds a full connection per client — great for migrations and LISTEN/NOTIFY, terrible for a
 * dev server with HMR or a serverless runtime that creates fresh clients frequently. We therefore
 * reserve it for fallback reads in `lib/prisma-direct.ts`.
 *
 * `idle_in_transaction_session_timeout = 60s` is also set on the Supabase database (migration
 * `auto_kill_stuck_idle_transactions`) so any leaked transactions self-heal within a minute.
 */
function buildRuntimeClient(): PrismaClient {
  const preferred = (process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? "").trim();
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
