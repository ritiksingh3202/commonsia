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
 * If only the Supabase transaction pooler URL is set, derive the session pooler URL (port 5432, no pgbouncer).
 * prisma/schema.prisma requires DIRECT_URL; Vercel projects often omit it when only one string was pasted.
 */
export function deriveMissingDirectUrlFromDatabaseUrl(databaseUrl: string): string | null {
  const u = databaseUrl.trim();
  if (!u) return null;
  const isPooler = /pooler\.supabase\.(com|co)/i.test(u);
  if (!isPooler || !u.includes(":6543")) return null;
  try {
    const asHttp = u.replace(/^postgresql:\/\//i, "http://").replace(/^postgres:\/\//i, "http://");
    const parsed = new URL(asHttp);
    if (parsed.port !== "6543") return null;
    parsed.port = "5432";
    const sp = new URLSearchParams(parsed.search);
    sp.delete("pgbouncer");
    const q = sp.toString();
    parsed.search = q ? `?${q}` : "";
    const scheme = u.startsWith("postgres://") ? "postgres:" : "postgresql:";
    return parsed.toString().replace(/^http:\/\//i, `${scheme}//`);
  } catch {
    return null;
  }
}

/**
 * Append pool tuning params to a Supabase pooler URL if the caller didn't set them.
 *
 * Without explicit `connection_limit` + `pool_timeout`, Prisma uses `num_cpus * 2 + 1` and waits
 * up to 10s for a free slot. On Vercel that means every cold-started lambda tries to open many
 * connections and stalls under load; locally `next dev` + HMR churn can exhaust a session pool in
 * seconds. Either surfaces as
 *   "Unable to check out connection from the pool due to timeout"
 * on `/mentors` / `/mentors/:id` (which then returns 0 rows and poisons the Redis cache).
 *
 * Tuning depends on *which* pool the URL points at:
 *
 *   Transaction pool (port 6543, pgbouncer, used by `DATABASE_URL` / primary `prisma` client):
 *     - Serverless:   1 connection per invocation (pgbouncer multiplexes at the proxy).
 *     - Local dev:   10 concurrent connections is plenty for SSR + photo route fan-out.
 *
 *   Session pool (port 5432, used by `DIRECT_URL` / fallback `prismaDirect` client):
 *     - Serverless:   1 connection.
 *     - Local dev:    2 connections — the session pool only has ~15 slots on Supabase free/pro,
 *                     and this client is fallback-only. Holding more just starves migrations.
 */
function applyPrismaPoolDefaults(
  rawUrl: string,
  pool: "transaction" | "session",
): string {
  const url = rawUrl.trim();
  if (!url) return rawUrl;
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) return rawUrl;
  const isSupabase = /pooler\.supabase/i.test(url);
  const isPgBouncer = /pgbouncer=true/i.test(url) || /:6543\//.test(url);
  if (!isSupabase && !isPgBouncer) return rawUrl;
  try {
    const asHttp = url.replace(/^postgresql:\/\//i, "http://").replace(/^postgres:\/\//i, "http://");
    const parsed = new URL(asHttp);
    const sp = parsed.searchParams;
    const isServerless = Boolean(process.env.VERCEL || process.env.NEXT_RUNTIME === "edge");
    let connLimit: string;
    if (pool === "transaction") {
      connLimit = isServerless ? "1" : "10";
    } else {
      connLimit = isServerless ? "1" : "2";
    }
    if (!sp.has("connection_limit")) sp.set("connection_limit", connLimit);
    if (!sp.has("pool_timeout")) sp.set("pool_timeout", isServerless ? "30" : "20");
    parsed.search = sp.toString() ? `?${sp.toString()}` : "";
    const scheme = url.startsWith("postgres://") ? "postgres:" : "postgresql:";
    return parsed.toString().replace(/^http:\/\//i, `${scheme}//`);
  } catch {
    return rawUrl;
  }
}

/**
 * `schema.prisma` uses `directUrl = env("DIRECT_URL")`. Local `.env` often only sets `DATABASE_URL`;
 * Vercel fills `DIRECT_URL` in `next.config.ts`. Mirror that here so Prisma + PrismaAdapter behave the same.
 */
export function ensureDirectUrlForPrismaRuntime(): void {
  normalizePostgresUrlEnvVar("DATABASE_URL");
  normalizePostgresUrlEnvVar("DIRECT_URL");

  const tunedDbUrl = applyPrismaPoolDefaults(process.env.DATABASE_URL ?? "", "transaction");
  if (tunedDbUrl && tunedDbUrl !== process.env.DATABASE_URL) {
    process.env.DATABASE_URL = tunedDbUrl;
  }

  const existing = (process.env.DIRECT_URL ?? "").trim();
  if (!existing) {
    const dbUrl = (process.env.DATABASE_URL ?? "").trim();
    if (!dbUrl) return;
    const derived = deriveMissingDirectUrlFromDatabaseUrl(dbUrl);
    process.env.DIRECT_URL = derived ?? dbUrl;
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[commonsia] DIRECT_URL was empty; set from DATABASE_URL" +
          (derived ? " (6543 → 5432 session pooler)" : "") +
          ". Prefer defining both in .env (see .env.example).",
      );
    }
  }

  /**
   * Tune DIRECT_URL too — it's used by the fallback `prismaDirect` client. Without a tight
   * `connection_limit` the session pool (~15 slots on Supabase free/pro) saturates on dev hot
   * reload and both pools end up timing out. Session-pool defaults are smaller than transaction.
   */
  const tunedDirectUrl = applyPrismaPoolDefaults(process.env.DIRECT_URL ?? "", "session");
  if (tunedDirectUrl && tunedDirectUrl !== process.env.DIRECT_URL) {
    process.env.DIRECT_URL = tunedDirectUrl;
  }
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

  let d = (process.env.DIRECT_URL ?? "").trim();
  if (!d) {
    const derived = deriveMissingDirectUrlFromDatabaseUrl(u);
    if (derived) {
      process.env.DIRECT_URL = derived;
      d = derived;
      console.warn(
        "[commonsia] DIRECT_URL was unset on Vercel; derived session pooler URL from DATABASE_URL (6543 → 5432, " +
          "pgbouncer param removed). Prefer setting DIRECT_URL explicitly in Vercel for clarity.",
      );
    } else {
      process.env.DIRECT_URL = u;
      d = u;
      console.warn(
        "[commonsia] DIRECT_URL was unset on Vercel; defaulted to DATABASE_URL. " +
          "For Supabase with a transaction pooler on DATABASE_URL, add DIRECT_URL (session pooler, port 5432) " +
          "from Settings → Database → Connection pooling so migrations and introspection stay reliable.",
      );
    }
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
