import { auth } from "@/auth";
import { parseDataUrlToBuffer } from "@/lib/data-url-file";
import { canViewOthersPortfolio } from "@/lib/portfolio-access";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ userId: string }> };

function safeFileName(name: string | null, mime: string): string {
  const n = name?.trim();
  if (n && /^[\w.\- ()\[\]]+$/.test(n) && n.length <= 200) return n;
  if (mime.includes("pdf")) return "portfolio.pdf";
  if (mime.includes("zip")) return "portfolio.zip";
  return "portfolio";
}

/**
 * GET — stream uploaded portfolio (PDF/ZIP) or redirect to external portfolio URL.
 * Auth required. Access: owner, or mentor↔student when `portfolioVisibleToOthers` is true.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await ctx.params;
  if (!userId) {
    return NextResponse.json({ error: "Missing user" }, { status: 400 });
  }

  const allowed = await canViewOthersPortfolio({
    viewerId: session.user.id,
    viewerRole: session.user.role ?? null,
    targetUserId: userId,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      portfolioFileDataUrl: true,
      portfolioFileName: true,
      portfolioUrl: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user.portfolioFileDataUrl?.trim()) {
    const parsed = parseDataUrlToBuffer(user.portfolioFileDataUrl);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid stored file" }, { status: 500 });
    }
    const filename = safeFileName(user.portfolioFileName, parsed.mime);
    return new NextResponse(new Uint8Array(parsed.buffer), {
      status: 200,
      headers: {
        "Content-Type": parsed.mime,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=0",
      },
    });
  }

  const url = user.portfolioUrl?.trim();
  if (url && /^https?:\/\//i.test(url)) {
    return NextResponse.redirect(url);
  }

  return NextResponse.json({ error: "No portfolio uploaded" }, { status: 404 });
}
