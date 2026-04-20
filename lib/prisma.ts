import { ensureDirectUrlForPrismaRuntime, warnDatabaseUrlMisconfigDevOnce } from "@/lib/db-url-env";
import { initSoftDeleteRuntimeSupport } from "@/lib/user-active";
import { PrismaClient } from "@prisma/client";

ensureDirectUrlForPrismaRuntime();
warnDatabaseUrlMisconfigDevOnce();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

initSoftDeleteRuntimeSupport(prisma);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
