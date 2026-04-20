import { ensureDirectUrlForPrismaRuntime, warnDatabaseUrlMisconfigDevOnce } from "@/lib/db-url-env";
import { initSoftDeleteRuntimeSupport } from "@/lib/user-active";
import { PrismaClient } from "@prisma/client";

ensureDirectUrlForPrismaRuntime();
warnDatabaseUrlMisconfigDevOnce();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Reuse one `PrismaClient` per runtime isolate (dev + Vercel serverless). Omitting the global in
 * production caused extra client churn in some deployments; Prisma recommends a global singleton
 * for connection pooling / fewer “too many connections” flakes during auth.
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

initSoftDeleteRuntimeSupport(prisma);

globalForPrisma.prisma = prisma;
