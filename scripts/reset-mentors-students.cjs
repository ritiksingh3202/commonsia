/**
 * Deletes only User rows with role "mentor" or "student".
 * Cascades remove related Account, Session, MentoringBooking, ChatThread, ChatMessage,
 * SessionReview rows tied to those users (per Prisma schema).
 *
 * Does NOT delete: VerificationToken, or users with other/null roles.
 *
 * Usage (from repo root, with DATABASE_URL set):
 *   node scripts/reset-mentors-students.cjs
 */

const { PrismaClient } = require("@prisma/client");

const PUBLIC_MENTORS_CACHE_KEY = "commonsia:v1:mentors:public-list:v2";

async function clearPublicMentorsRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    console.log("[reset] Upstash Redis not configured — skipped cache key delete (TTL will expire).");
    return;
  }
  try {
    const { Redis } = require("@upstash/redis");
    const redis = new Redis({ url, token });
    await redis.del(PUBLIC_MENTORS_CACHE_KEY);
    console.log("[reset] Cleared Redis public mentors list cache.");
  } catch (e) {
    console.warn("[reset] Redis del failed (non-fatal):", e?.message ?? e);
  }
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const before = await prisma.user.count({
      where: { role: { in: ["mentor", "student"] } },
    });
    console.log(`[reset] Found ${before} user(s) with role mentor or student.`);

    const result = await prisma.user.deleteMany({
      where: { role: { in: ["mentor", "student"] } },
    });

    console.log(`[reset] Deleted ${result.count} user(s). Sessions and OAuth accounts for them are removed (cascade).`);

    await clearPublicMentorsRedis();

    const remaining = await prisma.user.count();
    console.log(`[reset] Remaining users (any role): ${remaining}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
