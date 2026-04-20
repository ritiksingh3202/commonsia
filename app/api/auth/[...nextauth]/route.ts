import type { NextRequest } from "next/server";

import { handlers } from "@/auth";

/** Prisma adapter requires Node (not Edge). */
export const runtime = "nodejs";

/**
 * Detect `/api/auth/session` without `new URL(req.url)` — in some runtimes / proxies `req.url`
 * can be relative or malformed, which throws and bypasses our JSON fallback (SessionProvider
 * then parses HTML and throws ClientFetchError).
 */
function pathnameIsAuthSession(req: NextRequest): boolean {
  const p = req.nextUrl.pathname.replace(/\/$/, "") || "/";
  return p === "/api/auth/session";
}

function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("json");
}

/** Next error pages / proxies sometimes return HTML with a JSON-ish content-type. */
async function responseBodyLooksLikeHtml(res: Response): Promise<boolean> {
  try {
    const prefix = (await res.clone().text()).slice(0, 80).trimStart().toLowerCase();
    return prefix.startsWith("<!") || prefix.startsWith("<html") || prefix.startsWith("<head");
  } catch {
    return true;
  }
}

/**
 * When the DB is down (e.g. Neon “data transfer quota exceeded”), Next can respond to
 * `/api/auth/session` with an HTML error page. SessionProvider then throws ClientFetchError
 * (“Unexpected token '<'”). Coerce session routes to JSON so the shell still loads.
 */
async function safeGet(req: NextRequest): Promise<Response> {
  const sessionRoute = pathnameIsAuthSession(req);
  try {
    const res = await handlers.GET(req);
    if (sessionRoute && (!isJsonResponse(res) || (await responseBodyLooksLikeHtml(res)))) {
      console.warn("[api/auth] GET session returned non-JSON or HTML body; returning empty session.");
      return Response.json(null, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-cache, no-store",
        },
      });
    }
    return res;
  } catch (err) {
    console.error("[api/auth] GET", err);
    if (sessionRoute || pathnameIsAuthSession(req)) {
      return Response.json(null, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-cache, no-store",
        },
      });
    }
    throw err;
  }
}

async function safePost(req: NextRequest): Promise<Response> {
  const sessionRoute = pathnameIsAuthSession(req);
  try {
    const res = await handlers.POST(req);
    if (sessionRoute && (!isJsonResponse(res) || (await responseBodyLooksLikeHtml(res)))) {
      console.warn("[api/auth] POST session returned non-JSON or HTML body; returning empty session.");
      return Response.json(null, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return res;
  } catch (err) {
    console.error("[api/auth] POST", err);
    if (sessionRoute || pathnameIsAuthSession(req)) {
      return Response.json(null, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw err;
  }
}

/** Explicit `NextRequest` so `next build` matches Auth.js `handlers` (avoids `Request` inference on `export const`). */
export async function GET(req: NextRequest) {
  return safeGet(req);
}

export async function POST(req: NextRequest) {
  return safePost(req);
}
