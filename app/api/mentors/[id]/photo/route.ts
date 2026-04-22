import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { parseDataUrlToBuffer } from "@/lib/data-url-file";
import { withPoolFallback } from "@/lib/db-resilient";
import {
  CacheKeys,
  CacheTtl,
  readBlobCache,
  writeBlobCache,
} from "@/lib/redis-cache";
import { getActiveUserWhere } from "@/lib/user-active";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Public mentor headshot for directory cards.
 *
 * Optimized for instant re-hits:
 *   1. Card URLs include `?v={contentHash}` derived from the raw `data:` URL. Versioned URLs
 *      are effectively immutable — if the mentor uploads a new photo, the hash (and URL) change.
 *   2. On first request per version we fetch from Postgres, decode base64, cache the raw bytes
 *      in Redis keyed by `${id}:${version}` for 7 days, and send them. Subsequent requests for
 *      the same URL read the bytes straight from Redis — no DB roundtrip, no re-parsing.
 *   3. Browsers get `Cache-Control: public, max-age=31536000, immutable` when the `?v=` is
 *      present; for un-versioned legacy URLs we keep the short TTL + SWR combo.
 */
export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return new NextResponse(null, { status: 400 });
  }

  const versionParam = (new URL(req.url).searchParams.get("v") ?? "").trim().slice(0, 32);
  const hasVersion = versionParam.length > 0;
  const cacheKey = hasVersion ? CacheKeys.mentorPhotoBlob(id, versionParam) : null;

  const immutableHeaders = {
    /** Versioned URL + content-hashed key → safe to tell the browser "never re-ask us". */
    "Cache-Control": "public, max-age=31536000, immutable",
  } as const;
  const revalidatingHeaders = {
    "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
  } as const;

  if (cacheKey) {
    const cached = await readBlobCache(cacheKey);
    if (cached) {
      if (req.headers.get("if-none-match") === cached.etag) {
        return new NextResponse(null, {
          status: 304,
          headers: { ETag: cached.etag, ...immutableHeaders },
        });
      }
      return new NextResponse(cached.bytes, {
        status: 200,
        headers: {
          "Content-Type": cached.mime,
          ETag: cached.etag,
          ...immutableHeaders,
        },
      });
    }
  }

  let image: string | null;
  try {
    image = await withPoolFallback(async (client) => {
      const user = await client.user.findFirst({
        where: { ...getActiveUserWhere(), id, role: "mentor", mentorOnboardingComplete: true },
        select: { image: true },
      });
      return user?.image?.trim() ?? null;
    }, { label: "mentorPhoto" });
  } catch (err) {
    /** Both pools down — don't 500 the card; render a 503 that the browser can retry-load. */
    console.warn("[api/mentors/:id/photo] both pools failed:", err);
    return new NextResponse(null, {
      status: 503,
      headers: { "Retry-After": "5", "Cache-Control": "no-store" },
    });
  }
  if (!image) {
    return new NextResponse(null, { status: 404 });
  }

  if (image.startsWith("data:")) {
    const parsed = parseDataUrlToBuffer(image);
    if (!parsed) {
      return new NextResponse(null, { status: 400 });
    }
    const mime = parsed.mime.startsWith("image/") ? parsed.mime : "image/jpeg";
    const etag = `"${createHash("sha256").update(image).digest("hex").slice(0, 28)}"`;
    const body = new Uint8Array(parsed.buffer);

    if (cacheKey) {
      /** Fire-and-forget: don't block the response on the cache write. */
      void writeBlobCache(cacheKey, { bytes: body, mime, etag }, CacheTtl.mentorPhotoBlob);
    }

    if (req.headers.get("if-none-match") === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: etag, ...(hasVersion ? immutableHeaders : revalidatingHeaders) },
      });
    }
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": mime,
        ETag: etag,
        ...(hasVersion ? immutableHeaders : revalidatingHeaders),
      },
    });
  }

  if (image.startsWith("https://") || image.startsWith("http://")) {
    return NextResponse.redirect(image, 302);
  }

  return new NextResponse(null, { status: 404 });
}
