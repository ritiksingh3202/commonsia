import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * After adding `User.accountDeletedAt`, `npx prisma generate` must succeed or Prisma throws
 * `Unknown argument accountDeletedAt` on every query that uses it — which breaks OAuth
 * (session callback) while the Next dev server often locks the Windows query engine DLL (EPERM).
 *
 * We probe the **generated** client so the app stays usable until generate + dev restart succeed.
 */
function readGeneratedClientHasAccountDeletedAt(): boolean {
  try {
    const p = join(process.cwd(), "node_modules", ".prisma", "client", "index.d.ts");
    return readFileSync(p, "utf8").includes("accountDeletedAt");
  } catch {
    return false;
  }
}

let cachedProd: boolean | null = null;

export function prismaGeneratedClientHasAccountDeletedAt(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return readGeneratedClientHasAccountDeletedAt();
  }
  if (cachedProd === null) {
    cachedProd = readGeneratedClientHasAccountDeletedAt();
  }
  return cachedProd;
}

/** Prisma `where` fragment: active users only (empty object when the client is not regenerated yet). */
export function getActiveUserWhere(): { accountDeletedAt: null } | Record<string, never> {
  return prismaGeneratedClientHasAccountDeletedAt() ? { accountDeletedAt: null } : {};
}
