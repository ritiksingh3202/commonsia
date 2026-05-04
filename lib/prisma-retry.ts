import type { PrismaClient } from "@prisma/client";

/**
 * Connection-related error codes that signal a stale / dead pooled connection.
 * On a serverless platform with pgbouncer (Supabase), the pooler kills idle TCP
 * connections after ~60s. Prisma keeps the dead connection in its in-memory pool
 * and the *next* query fails with one of these codes. Retrying the same query
 * forces Prisma to discard the bad connection and grab a fresh one, which then
 * succeeds — invisible to the caller.
 *
 *   P1017  — "Server has closed the connection."  (most common — idle pgbouncer kill)
 *   P1001  — "Can't reach database server."        (transient TCP / DNS hiccup)
 *   P1002  — "Database server timeout."             (slow first connect after cold start)
 */
const RETRYABLE_PRISMA_CODES = new Set(["P1017", "P1001", "P1002"]);

const RETRYABLE_MESSAGE_PATTERNS = [
  /server has closed the connection/i,
  /connection terminated unexpectedly/i,
  /Closed the connection/i,
];

function isStaleConnectionError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const code = (e as { code?: string }).code;
  if (code && RETRYABLE_PRISMA_CODES.has(code)) return true;
  const msg = (e as { message?: string }).message;
  if (typeof msg === "string" && RETRYABLE_MESSAGE_PATTERNS.some((re) => re.test(msg))) return true;
  return false;
}

async function callWithRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (!isStaleConnectionError(e)) throw e;
    console.warn(`[prisma-retry] ${label} hit stale connection (${(e as Error).message}); retrying once`);
    try {
      return await fn();
    } catch (e2) {
      console.error(`[prisma-retry] ${label} retry also failed:`, e2);
      throw e2;
    }
  }
}

/**
 * Pass-through methods that should NOT be retry-wrapped.
 *
 * `$transaction` is excluded because retrying a partially-applied interactive
 * transaction is unsafe (operations may have already committed work). If a
 * transaction body throws P1017, the caller's catch can decide what to do.
 *
 * `$connect`, `$disconnect`, `$on`, `$use`, `$extends` are lifecycle / setup —
 * not query-shaped, no retry semantics needed.
 */
const PASSTHROUGH_TOP_KEYS = new Set([
  "$transaction",
  "$connect",
  "$disconnect",
  "$on",
  "$use",
  "$extends",
]);

const RAW_TOP_KEYS = new Set([
  "$queryRaw",
  "$queryRawUnsafe",
  "$executeRaw",
  "$executeRawUnsafe",
  "$runCommandRaw",
]);

/**
 * Wrap a Prisma client so every model query (`prisma.user.findMany(...)`) and
 * every raw query (`prisma.$queryRaw\`...\``) auto-retries once on stale
 * connection errors. Type signature is preserved — TS still sees a PrismaClient.
 */
export function withConnectionRetry<T extends PrismaClient>(client: T): T {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // Raw query helpers at the top level.
      if (typeof prop === "string" && RAW_TOP_KEYS.has(prop) && typeof value === "function") {
        const fn = value as (...args: unknown[]) => Promise<unknown>;
        return (...args: unknown[]) =>
          callWithRetry(prop, () => fn.apply(target, args));
      }

      // Lifecycle / transaction methods — pass through unchanged.
      if (typeof prop === "string" && PASSTHROUGH_TOP_KEYS.has(prop)) {
        return value;
      }

      // Model accessors (`prisma.user`, `prisma.forumPost`, etc.) — wrap each method.
      if (
        typeof prop === "string" &&
        !prop.startsWith("$") &&
        !prop.startsWith("_") &&
        value !== null &&
        typeof value === "object"
      ) {
        return new Proxy(value as object, {
          get(modelTarget, modelProp, modelReceiver) {
            const modelValue = Reflect.get(modelTarget, modelProp, modelReceiver);
            if (
              typeof modelValue === "function" &&
              typeof modelProp === "string" &&
              !modelProp.startsWith("$") &&
              !modelProp.startsWith("_")
            ) {
              const fn = modelValue as (...args: unknown[]) => Promise<unknown>;
              return (...args: unknown[]) =>
                callWithRetry(`${prop}.${modelProp}`, () => fn.apply(modelTarget, args));
            }
            return modelValue;
          },
        });
      }

      return value;
    },
  });
}
