import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const MAX_BYTES = 10 * 1024 * 1024;

function isAllowedPdfOrZip(file: File): boolean {
  const n = file.name.toLowerCase();
  const t = file.type;
  if (n.endsWith(".pdf") || t === "application/pdf") return true;
  if (n.endsWith(".zip") || t === "application/zip" || t === "application/x-zip-compressed") return true;
  return false;
}

/** Multipart upload for portfolio PDF/ZIP (avoids huge JSON PATCH bodies). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!isAllowedPdfOrZip(file)) {
    return NextResponse.json({ error: "Only PDF or ZIP files are allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be 10MB or smaller" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || (file.name.toLowerCase().endsWith(".zip") ? "application/zip" : "application/pdf");
  const b64 = buf.toString("base64");
  const dataUrl = `data:${mime};base64,${b64}`;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      portfolioFileName: file.name,
      portfolioFileDataUrl: dataUrl,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      portfolioFileName: null,
      portfolioFileDataUrl: null,
    },
  });

  return NextResponse.json({ ok: true });
}
