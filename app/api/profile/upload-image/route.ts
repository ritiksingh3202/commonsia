import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  invalidateMentorDashboardLive,
  invalidatePublicMentorProfile,
  invalidatePublicMentorsList,
} from "@/lib/redis-cache";

export const runtime = "nodejs";

/**
 * POST /api/profile/upload-image?type=avatar|banner
 *
 * Accepts a multipart/form-data with a `file` field. Uploads the image to
 * Supabase Storage and writes the resulting public CDN URL back to the User row.
 * Replaces the old flow that stored base64 `data:` strings directly in Postgres.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in env (the legacy JWT service_role key).
 * SUPABASE_URL is derived from DATABASE_URL if not set explicitly.
 */

function getSupabaseUrl(): string {
  const explicit = process.env.SUPABASE_URL?.trim();
  if (explicit) return explicit;
  // Derive from postgresql://postgres.PROJECT_REF:...@...pooler.supabase.com/...
  const db = (process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? "").trim();
  const match = db.match(/postgres(?:ql)?:\/\/postgres\.([^:@]+)/i);
  return match ? `https://${match[1]}.supabase.co` : "";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supabaseUrl = getSupabaseUrl();
  if (!serviceKey || !supabaseUrl) {
    console.error("[upload-image] SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL not configured");
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // "avatar" | "banner"
  const bucket = type === "banner" ? "banners" : "avatars";
  const dbField = type === "banner" ? "bannerImageUrl" : "image";

  let file: File | null = null;
  try {
    const fd = await req.formData();
    file = fd.get("file") as File | null;
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  /** 500 KB hard cap — matches the existing Postgres upload limit. */
  if (file.size > 500 * 1024) {
    return NextResponse.json(
      { error: "File too large. Maximum 500 KB." },
      { status: 413 },
    );
  }

  const mime = file.type || "image/jpeg";
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const filename = `user-${session.user.id}.${ext}`;
  const bytes = await file.arrayBuffer();

  // Upload (upsert) to Supabase Storage
  const storageRes = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${filename}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": mime,
        "x-upsert": "true",
      },
      body: bytes,
    },
  );

  if (!storageRes.ok) {
    const body = await storageRes.text().catch(() => "");
    console.error("[upload-image] Supabase Storage upload failed:", storageRes.status, body);
    return NextResponse.json({ error: "Upload to storage failed" }, { status: 502 });
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;

  // Persist the CDN URL in the User row
  await prisma.user.update({
    where: { id: session.user.id },
    data: { [dbField]: publicUrl },
  });

  // Bust mentor caches so updated photo appears immediately
  const role = session.user.role;
  if (role === "mentor") {
    invalidatePublicMentorProfile(session.user.id);
    invalidatePublicMentorsList();
    invalidateMentorDashboardLive(session.user.id);
  }

  return NextResponse.json({ url: publicUrl });
}
