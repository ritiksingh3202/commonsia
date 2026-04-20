/**
 * Normalize Postgres URLs in `process.env` before Prisma reads them.
 * Vercel / dashboards often paste `.env`-style lines with wrapping `"` / `'`,
 * which breaks Prisma ("URL must start with postgresql://").
 */
export function normalizePostgresUrlEnvVar(name: "DATABASE_URL" | "DIRECT_URL"): void {
  const raw = process.env[name];
  if (raw == null) return;
  let v = String(raw).trim();
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
  ) {
    v = v.slice(1, -1).trim();
  }
  process.env[name] = v;
}

/**
 * Call from `next.config.ts` on Vercel so misconfigured env fails immediately with a clear message.
 */
export function assertValidDatabaseUrlForVercelBuild(): void {
  normalizePostgresUrlEnvVar("DATABASE_URL");
  normalizePostgresUrlEnvVar("DIRECT_URL");

  const u = (process.env.DATABASE_URL ?? "").trim();
  if (!u) {
    throw new Error(
      "Missing DATABASE_URL on Vercel. Add it under Project → Settings → Environment Variables " +
        "(Production + Preview if you deploy previews). Use the Supabase/Postgres URI that starts with " +
        "postgresql:// or postgres://. If you use Supabase's integration, map its connection string to DATABASE_URL.",
    );
  }
  if (!u.startsWith("postgresql://") && !u.startsWith("postgres://")) {
    const head = u.slice(0, 24);
    throw new Error(
      "Invalid DATABASE_URL on Vercel: it must start with postgresql:// or postgres://. " +
        `Current value starts with: ${JSON.stringify(head)}… — remove wrapping quotes in the Vercel UI if you ` +
        "pasted from a .env file, and ensure the variable name is exactly DATABASE_URL.",
    );
  }

  const d = (process.env.DIRECT_URL ?? "").trim();
  if (!d) {
    throw new Error(
      "Missing DIRECT_URL on Vercel. prisma/schema.prisma uses `directUrl` for Supabase: copy the session pooler " +
        "URI (port 5432) from Supabase → Settings → Database → Connection pooling. DATABASE_URL should be the " +
        "transaction pooler (port 6543) with ?pgbouncer=true.",
    );
  }
  if (!d.startsWith("postgresql://") && !d.startsWith("postgres://")) {
    throw new Error(
      "Invalid DIRECT_URL on Vercel: must start with postgresql:// or postgres:// (session pooler on port 5432).",
    );
  }
}

type ParsedPgUrl = { username: string; hostname: string; port: string; search: string };

function tryParsePostgresUrl(raw: string | undefined): ParsedPgUrl | null {
  if (raw == null) return null;
  const v = String(raw).trim();
  if (!v.startsWith("postgresql://") && !v.startsWith("postgres://")) return null;
  try {
    const asHttp = v.replace(/^postgresql:\/\//i, "http://").replace(/^postgres:\/\//i, "http://");
    const u = new URL(asHttp);
    return {
      username: decodeURIComponent(u.username || ""),
      hostname: (u.hostname || "").toLowerCase(),
      port: u.port || "5432",
      search: u.search || "",
    };
  } catch {
    return null;
  }
}

/**
 * In dev, log once when `DATABASE_URL` looks like Supabase pooler but uses the wrong DB role name.
 * Supabase pooler expects `postgres.<project_ref>`, not bare `postgres` — otherwise auth fails with P1000.
 * Never logs the password.
 */
export function warnDatabaseUrlMisconfigDevOnce(): void {
  if (process.env.NODE_ENV === "production") return;
  const g = globalThis as unknown as { __commonsiaDbUrlWarned?: boolean };
  if (g.__commonsiaDbUrlWarned) return;

  const db = tryParsePostgresUrl(process.env.DATABASE_URL);
  if (!db) return;

  const isSupabasePooler =
    db.hostname.includes("pooler.supabase.com") || db.hostname.includes("pooler.supabase.co");
  const lines: string[] = [];
  if (isSupabasePooler && db.username === "postgres") {
    lines.push(
      "DATABASE_URL uses a Supabase pooler host but the username is `postgres`. " +
        "Use `postgres.<YOUR_PROJECT_REF>` from Supabase → Settings → Database → Connection pooling. " +
        "This often causes Prisma P1000 and Auth.js `error=Configuration` after OAuth.",
    );
  }
  if (isSupabasePooler && db.port === "6543" && !db.search.includes("pgbouncer=true")) {
    lines.push(
      "DATABASE_URL uses port 6543 (transaction pooler) but is missing `pgbouncer=true`. " +
        "Append `?pgbouncer=true&sslmode=require` (or merge those query params).",
    );
  }
  const isSupabaseDirectDb =
    db.hostname.startsWith("db.") && db.hostname.endsWith(".supabase.co");
  if (isSupabaseDirectDb) {
    lines.push(
      "DATABASE_URL uses direct host `db.*.supabase.co` — that hostname is often IPv6-only. " +
        "Windows and many campus networks then get Prisma P1001 (can't reach database). " +
        "Use Connection pooling URIs from Supabase (pooler.supabase.com, user `postgres.<ref>`).",
    );
  }
  if (lines.length) {
    g.__commonsiaDbUrlWarned = true;
    console.warn(`[commonsia] ${lines.join("\n")}`);
  }
}
