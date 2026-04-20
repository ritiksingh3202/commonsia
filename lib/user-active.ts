import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { PrismaClient } from "@prisma/client";

/**
 * `index.d.ts` can list `accountDeletedAt` after `prisma generate`, while Next/Turbopack may still
 * bundle a stale Prisma runtime — then `where: { accountDeletedAt: null }` throws
 * `Unknown argument accountDeletedAt`. We only enable soft-delete filters after a real query
 * against the loaded client succeeds.
 */
type SoftDeleteSupport = "unknown" | "yes" | "no";

let softDeleteSupport: SoftDeleteSupport = "unknown";
let probeScheduled = false;

function readGeneratedDtsMentionsAccountDeletedAt(): boolean {
  try {
    const p = join(process.cwd(), "node_modules", ".prisma", "client", "index.d.ts");
    return readFileSync(p, "utf8").includes("accountDeletedAt");
  } catch {
    return false;
  }
}

/**
 * Call once after `PrismaClient` is constructed. Resolves `softDeleteSupport` asynchronously.
 */
export function initSoftDeleteRuntimeSupport(client: PrismaClient): void {
  if (softDeleteSupport !== "unknown") {
    return;
  }
  if (!readGeneratedDtsMentionsAccountDeletedAt()) {
    softDeleteSupport = "no";
    return;
  }
  if (probeScheduled) {
    return;
  }
  probeScheduled = true;

  void client.user
    .findFirst({
      where: { id: "__commonsia_soft_delete_probe__", accountDeletedAt: null },
      select: { id: true },
    })
    .then(
      () => {
        softDeleteSupport = "yes";
      },
      (e: unknown) => {
        const m = String(e instanceof Error ? e.message : e);
        if (m.includes("Unknown argument") && m.includes("accountDeletedAt")) {
          softDeleteSupport = "no";
        } else {
          /** DB / network errors — assume field exists so we do not silently drop soft-delete rules. */
          softDeleteSupport = "yes";
        }
      },
    );
}

/** True only after the live Prisma client accepted `accountDeletedAt` in a `where` clause. */
export function prismaGeneratedClientHasAccountDeletedAt(): boolean {
  return softDeleteSupport === "yes";
}

/** Prisma `where` fragment: active users only (empty until runtime probe confirms support). */
export function getActiveUserWhere(): { accountDeletedAt: null } | Record<string, never> {
  return prismaGeneratedClientHasAccountDeletedAt() ? { accountDeletedAt: null } : {};
}
