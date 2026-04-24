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
 * Public mentor banner (cover) image — exact mirror of `/api/mentors/:id/photo` but
 * backed by `User.bannerImageUrl` instead of `User.image`. Exists so we can drop the
 * base64 `data:` URL from the HTML of `/mentors/[id]`: previously the 500 KB cover
 * blob was inlined into the SSR document for every mentor who uploaded a custom
 * banner, adding that much weight to every page load before the browser could paint.
 *
 * Optimized for instant re-hits:
 *   1. URLs include `?v={contentHash}` → a re-upload flips the hash and busts every
 *      cache downstream automatically.
 *   2. First request decodes the base64 once, caches raw bytes in Redis keyed by
 *      `${id}:${version}` for 7 days, and serves those bytes on repeat hits.
 *   3. Versioned URLs respond with `Cache-Control: public, max-age=31536000,
 *      immutable` + ETag, so the browser never re-asks until the mentor re-uploads.
 */
export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return new NextResponse(null, { status: 400 });
  }

  const versionParam = (new URL(req.url).searchParams.get("v") ?? "").trim().slice(0, 32);
  const hasVersion = versionParam.length > 0;
  const cacheKey = hasVersion ? CacheKeys.mentorBannerBlob(id, versionParam) : null;

  const immutableHeaders = {
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

  let banner: string | null;
  try {
    banner = await withPoolFallback(async (client) => {
      const user = await client.user.findFirst({
        where: { ...getActiveUserWhere(), id, role: "mentor", mentorOnboardingComplete: true },
        select: { bannerImageUrl: true },
      });
      return user?.bannerImageUrl?.trim() ?? null;
    }, { label: "mentorBanner" });
  } catch (err) {
    /** Pool fallback exhausted — render a retriable 503 rather than a permanent 500. */
    console.warn("[api/mentors/:id/banner] both pools failed:", err);
    return new NextResponse(null, {
      status: 503,
      headers: { "Retry-After": "5", "Cache-Control": "no-store" },
    });
  }
  if (!banner) {
    return new NextResponse(null, { status: 404 });
  }

  if (banner.startsWith("data:")) {
    const parsed = parseDataUrlToBuffer(banner);
    if (!parsed) {
      return new NextResponse(null, { status: 400 });
    }
    const mime = parsed.mime.startsWith("image/") ? parsed.mime : "image/jpeg";
    const etag = `"${createHash("sha256").update(banner).digest("hex").slice(0, 28)}"`;
    /** Slice into an isolated ArrayBuffer — Node's Buffer pool can be shared. */
    const body = parsed.buffer.buffer.slice(
      parsed.buffer.byteOffset,
      parsed.buffer.byteOffset + parsed.buffer.byteLength,
    ) as ArrayBuffer;

    if (cacheKey) {
      void writeBlobCache(cacheKey, { bytes: body, mime, etag }, CacheTtl.mentorBannerBlob);
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

  if (banner.startsWith("https://") || banner.startsWith("http://")) {
    return NextResponse.redirect(banner, 302);
  }

  return new NextResponse(null, { status: 404 });
}
