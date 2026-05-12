/**
 * One-shot migration: moves base64 `data:` profile photos and cover banners
 * from the Postgres `User` table to Supabase Storage, then updates each row
 * with the resulting public CDN URL.
 *
 * Before running:
 *   1. Add SUPABASE_SERVICE_ROLE_KEY to your .env.local
 *      (Supabase dashboard → Project Settings → API → service_role secret)
 *   2. Run in dry-run mode first to preview: node scripts/migrate-images-to-storage.cjs --dry-run
 *   3. Run for real: node scripts/migrate-images-to-storage.cjs
 *
 * Safe to re-run — already-migrated rows (https:// URLs) are skipped.
 */

"use strict";

const fs   = require("fs");
const path = require("path");

// ─── env loading (same pattern as db-ping.cjs) ───────────────────────────────

function stripQuotes(v) {
  let s = String(v).trim();
  if (s.length >= 2 &&
    ((s.startsWith('"') && s.endsWith('"')) ||
     (s.startsWith("'") && s.endsWith("'")))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    out[t.slice(0, eq).trim()] = stripQuotes(t.slice(eq + 1));
  }
  return out;
}

function loadEnv() {
  const root = path.resolve(__dirname, "..");
  const base  = parseEnvFile(path.join(root, ".env"));
  const local = parseEnvFile(path.join(root, ".env.local"));
  for (const [k, v] of Object.entries(base))  { if (process.env[k] === undefined) process.env[k] = v; }
  for (const [k, v] of Object.entries(local)) { process.env[k] = v; }
  for (const name of ["DATABASE_URL", "DIRECT_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_URL"]) {
    if (process.env[name]) process.env[name] = stripQuotes(String(process.env[name]));
  }
}

// ─── Supabase project ref from DATABASE_URL ───────────────────────────────────

function getProjectRef(databaseUrl) {
  // postgresql://postgres.PROJECT_REF:PASSWORD@...pooler.supabase.com:6543/postgres
  try {
    const asHttp = databaseUrl.replace(/^postgresql:\/\//i, "http://").replace(/^postgres:\/\//i, "http://");
    const u = new URL(asHttp);
    const user = u.username; // e.g. "postgres.abcdefghijklmnop"
    const parts = user.split(".");
    if (parts.length >= 2) return parts.slice(1).join(".");
  } catch {}
  return null;
}

// ─── Supabase Storage helpers ─────────────────────────────────────────────────

async function ensureBucketPublic(storageBase, serviceKey, bucketId) {
  // Try to create bucket; if it already exists (409) that's fine.
  const res = await fetch(`${storageBase}/bucket`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({ id: bucketId, name: bucketId, public: true }),
  });
  if (res.status === 200 || res.status === 201 || res.status === 409) return;
  const body = await res.text().catch(() => "");
  throw new Error(`Failed to create bucket "${bucketId}": ${res.status} ${body}`);
}

async function uploadToStorage(storageBase, serviceKey, bucket, filename, bytes, mimeType) {
  const res = await fetch(`${storageBase}/object/${bucket}/${filename}`, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type":  mimeType,
      "x-upsert":      "true",   // overwrite if already migrated
    },
    body: bytes,
  });
  if (res.status !== 200 && res.status !== 201) {
    const body = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}): ${body}`);
  }
}

// ─── data: URL parsing ────────────────────────────────────────────────────────

function parseDataUrl(dataUrl) {
  // data:<mime>;base64,<payload>
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/s);
  if (!match) return null;
  const mime = match[1].trim();
  const bytes = Buffer.from(match[2].trim(), "base64");
  return { mime, bytes };
}

function extensionForMime(mime) {
  if (mime.includes("png"))  return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif"))  return "gif";
  return "jpg"; // jpeg / default
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const DRY_RUN = process.argv.includes("--dry-run");
  if (DRY_RUN) console.log("🔍  DRY RUN — no changes will be made.\n");

  loadEnv();

  // Validate required env
  const dbUrl      = (process.env.DIRECT_URL || process.env.DATABASE_URL || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!dbUrl) {
    console.error("❌  DATABASE_URL / DIRECT_URL not set in .env.local");
    process.exit(1);
  }
  if (!serviceKey) {
    console.error("❌  SUPABASE_SERVICE_ROLE_KEY not set in .env.local");
    console.error("   → Supabase dashboard → Project Settings → API → service_role secret");
    process.exit(1);
  }

  // Derive Supabase project URL
  let supabaseUrl = (process.env.SUPABASE_URL || "").trim();
  if (!supabaseUrl) {
    const ref = getProjectRef(dbUrl);
    if (!ref) {
      console.error("❌  Could not derive Supabase project ref from DATABASE_URL.");
      console.error("   → Add SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co to .env.local");
      process.exit(1);
    }
    supabaseUrl = `https://${ref}.supabase.co`;
  }
  const storageBase = `${supabaseUrl}/storage/v1`;
  console.log(`🔗  Supabase: ${supabaseUrl}\n`);

  // Connect to Postgres via Prisma
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  try {
    // Ensure buckets exist
    if (!DRY_RUN) {
      process.stdout.write("Creating storage buckets... ");
      await ensureBucketPublic(storageBase, serviceKey, "avatars");
      await ensureBucketPublic(storageBase, serviceKey, "banners");
      console.log("✓");
    }

    // Fetch all users that still have data: URLs
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { image:          { startsWith: "data:" } },
          { bannerImageUrl: { startsWith: "data:" } },
        ],
      },
      select: { id: true, image: true, bannerImageUrl: true },
    });

    if (users.length === 0) {
      console.log("✅  No base64 images found — nothing to migrate.");
      return;
    }

    console.log(`Found ${users.length} user(s) with base64 images to migrate.\n`);

    let photoOk = 0, photoSkip = 0, photoErr = 0;
    let bannerOk = 0, bannerSkip = 0, bannerErr = 0;

    for (const user of users) {
      const updates = {};

      // ── profile photo ──────────────────────────────────────────────────────
      if (user.image?.startsWith("data:")) {
        const parsed = parseDataUrl(user.image);
        if (!parsed) {
          console.warn(`  ⚠  [${user.id}] photo — could not parse data URL, skipping`);
          photoSkip++;
        } else {
          const ext      = extensionForMime(parsed.mime);
          const filename = `user-${user.id}.${ext}`;
          const publicUrl = `${storageBase}/object/public/avatars/${filename}`;
          const sizeKb   = (parsed.bytes.length / 1024).toFixed(1);

          if (DRY_RUN) {
            console.log(`  📷  [${user.id}] photo  ${sizeKb} KB → avatars/${filename}`);
            photoOk++;
          } else {
            try {
              await uploadToStorage(storageBase, serviceKey, "avatars", filename, parsed.bytes, parsed.mime);
              updates.image = publicUrl;
              console.log(`  ✓   [${user.id}] photo  ${sizeKb} KB → ${publicUrl}`);
              photoOk++;
            } catch (err) {
              console.error(`  ✗   [${user.id}] photo  failed: ${err.message}`);
              photoErr++;
            }
          }
        }
      }

      // ── cover banner ───────────────────────────────────────────────────────
      if (user.bannerImageUrl?.startsWith("data:")) {
        const parsed = parseDataUrl(user.bannerImageUrl);
        if (!parsed) {
          console.warn(`  ⚠  [${user.id}] banner — could not parse data URL, skipping`);
          bannerSkip++;
        } else {
          const ext      = extensionForMime(parsed.mime);
          const filename = `user-${user.id}.${ext}`;
          const publicUrl = `${storageBase}/object/public/banners/${filename}`;
          const sizeKb   = (parsed.bytes.length / 1024).toFixed(1);

          if (DRY_RUN) {
            console.log(`  🖼   [${user.id}] banner ${sizeKb} KB → banners/${filename}`);
            bannerOk++;
          } else {
            try {
              await uploadToStorage(storageBase, serviceKey, "banners", filename, parsed.bytes, parsed.mime);
              updates.bannerImageUrl = publicUrl;
              console.log(`  ✓   [${user.id}] banner ${sizeKb} KB → ${publicUrl}`);
              bannerOk++;
            } catch (err) {
              console.error(`  ✗   [${user.id}] banner failed: ${err.message}`);
              bannerErr++;
            }
          }
        }
      }

      // ── write back URLs ────────────────────────────────────────────────────
      if (!DRY_RUN && Object.keys(updates).length > 0) {
        try {
          await prisma.user.update({ where: { id: user.id }, data: updates });
        } catch (err) {
          console.error(`  ✗   [${user.id}] DB update failed: ${err.message}`);
        }
      }
    }

    console.log(`
─────────────────────────────────────────
Profile photos : ${photoOk} migrated, ${photoSkip} skipped, ${photoErr} errors
Cover banners  : ${bannerOk} migrated, ${bannerSkip} skipped, ${bannerErr} errors
─────────────────────────────────────────`);

    if (DRY_RUN) {
      console.log("\n✅  Dry run complete. Run without --dry-run to apply.\n");
    } else if (photoErr === 0 && bannerErr === 0) {
      console.log("\n✅  Migration complete. User table base64 blobs replaced with CDN URLs.\n");
      console.log("Next steps:");
      console.log("  1. Deploy your code changes (upload path now uses Storage)");
      console.log("  2. Verify a few profile pages look correct");
      console.log("  3. (Optional) Run the SQL below to confirm no data: rows remain:\n");
      console.log(`     SELECT COUNT(*) FROM "User" WHERE image LIKE 'data:%' OR "bannerImageUrl" LIKE 'data:%';\n`);
    } else {
      console.log("\n⚠   Migration finished with errors. Check logs above and re-run to retry failed rows.\n");
    }

  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
