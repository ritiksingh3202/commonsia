/**
 * Verifies Postgres credentials the same way the app does after env normalization.
 * Loads `.env` then `.env.local` (local overrides), strips wrapping quotes on values.
 * Usage: `node scripts/db-ping.cjs` (or `npm run db:ping`)
 */
const fs = require("fs");
const path = require("path");

function stripQuotes(v) {
  let s = String(v).trim();
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    val = stripQuotes(val);
    out[key] = val;
  }
  return out;
}

function loadEnv() {
  const root = path.resolve(__dirname, "..");
  const base = parseEnvFile(path.join(root, ".env"));
  const local = parseEnvFile(path.join(root, ".env.local"));
  /** Same idea as Next: `.env` fills defaults; `.env.local` wins for keys it defines. */
  for (const [k, v] of Object.entries(base)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
  for (const [k, v] of Object.entries(local)) {
    process.env[k] = v;
  }
  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    const raw = process.env[name];
    if (raw != null) process.env[name] = stripQuotes(String(raw));
  }
}

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL after loading .env / .env.local");
    process.exit(1);
  }
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    console.log("Database: OK (credentials accepted).");
  } catch (e) {
    console.error("Database:", e.message || e);
    if (/P1000|Authentication failed|credentials/i.test(String(e.message))) {
      console.error(
        "\n→ Fix: Supabase → Project Settings → Database → reset database password, then paste the NEW " +
          "pooling URIs into DATABASE_URL and DIRECT_URL (see .env.example). Do not reuse an old password string.",
      );
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
