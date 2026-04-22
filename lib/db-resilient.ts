import { prisma } from "@/lib/prisma";
import { prismaDirect } from "@/lib/prisma-direct";

/**
 * Run a read query with automatic cross-pool failover.
 *
 * Tries the primary client (session pool). On any error that looks like a pool-exhaustion
 * event ("pool", "connection", "timeout") we retry the same `run` once against `prismaDirect`
 * (transaction pool). If both pools are broken the error re-throws and the caller can render
 * a graceful fallback (empty list, zero stats, etc.).
 *
 * Keep this to read-only queries. Writes should stay on the primary client so we don't split
 * the write path across two URLs / pools.
 */
export async function withPoolFallback<T>(
  run: (client: typeof prisma) => Promise<T>,
  opts?: { label?: string },
): Promise<T> {
  try {
    return await run(prisma);
  } catch (primaryErr) {
    const msg = String((primaryErr as { message?: unknown })?.message ?? primaryErr ?? "")
      .toLowerCase();
    const looksLikePoolIssue =
      msg.includes("pool") ||
      msg.includes("check out connection") ||
      msg.includes("connection") ||
      msg.includes("timeout");
    if (!looksLikePoolIssue) throw primaryErr;
    if (opts?.label) {
      console.warn(`[withPoolFallback] ${opts.label}: primary pool failed, retrying via fallback.`);
    }
    return run(prismaDirect);
  }
}
