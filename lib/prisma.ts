import { normalizePostgresUrlEnvVar, warnDatabaseUrlMisconfigDevOnce } from "@/lib/db-url-env";
import { PrismaClient } from "@prisma/client";

normalizePostgresUrlEnvVar("DATABASE_URL");
normalizePostgresUrlEnvVar("DIRECT_URL");
warnDatabaseUrlMisconfigDevOnce();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
