import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { parseDataUrlToBuffer } from "@/lib/data-url-file";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Public mentor headshot for directory cards.
 * Large `data:` avatars are not embedded in the cached `/mentors` JSON — cards use this URL instead.
 */
export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return new NextResponse(null, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { id, role: "mentor", mentorOnboardingComplete: true },
    select: { image: true },
  });
  const image = user?.image?.trim();
  if (!image) {
    return new NextResponse(null, { status: 404 });
  }

  if (image.startsWith("data:")) {
    const parsed = parseDataUrlToBuffer(image);
    if (!parsed) {
      return new NextResponse(null, { status: 400 });
    }
    const etag = `"${createHash("sha256").update(image).digest("hex").slice(0, 28)}"`;
    if (req.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }
    const mime = parsed.mime.startsWith("image/") ? parsed.mime : "image/jpeg";
    const body = new Uint8Array(parsed.buffer);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": mime,
        ETag: etag,
        "Cache-Control": "private, max-age=120, stale-while-revalidate=600",
      },
    });
  }

  if (image.startsWith("https://") || image.startsWith("http://")) {
    return NextResponse.redirect(image, 302);
  }

  return new NextResponse(null, { status: 404 });
}
