import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getGoogleCalendarOAuthClient,
  getGoogleOAuthClient,
  getLinkedInOAuthClient,
} from "@/lib/oauth-credentials";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Runtime auth diagnostics — reports what the server resolved WITHOUT leaking secrets.
 *
 * Gated by `AUTH_DEBUG=1` so it returns 404 in normal operation. Turn it on in Vercel →
 * Environment Variables → `AUTH_DEBUG=1`, redeploy, then visit `/api/auth/debug`.
 * Remove the env var once done. Values are booleans, lengths, and host parts only — no
 * secrets, passwords, client secrets, tokens, or full URLs with credentials.
 */

function maskUrl(raw: string | undefined | null): {
  set: boolean;
  scheme?: string;
  host?: string;
  port?: string;
  pathname?: string;
  hasQuery?: boolean;
} {
  const v = (raw ?? "").trim();
  if (!v) return { set: false };
  try {
    const asHttp = v
      .replace(/^postgresql:\/\//i, "http://")
      .replace(/^postgres:\/\//i, "http://");
    const u = new URL(asHttp);
    return {
      set: true,
      scheme: v.match(/^[a-z+]+:\/\//i)?.[0]?.replace("://", "") ?? u.protocol.replace(":", ""),
      host: u.hostname.toLowerCase(),
      port: u.port || undefined,
      pathname: u.pathname || undefined,
      hasQuery: Boolean(u.search),
    };
  } catch {
    return { set: true };
  }
}

function lengthInfo(raw: string | undefined | null): { set: boolean; length: number } {
  const v = (raw ?? "").trim();
  return { set: v.length > 0, length: v.length };
}

export async function GET(req: NextRequest) {
  if (process.env.AUTH_DEBUG !== "1") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const reqHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const reqProto = req.headers.get("x-forwarded-proto") ?? "";
  const google = getGoogleOAuthClient();
  const googleCalendar = getGoogleCalendarOAuthClient();
  const linkedin = getLinkedInOAuthClient();

  let dbOk = false;
  let dbError: string | null = null;
  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    dbOk = true;
  } catch (e) {
    dbError =
      e instanceof Error
        ? e.message.slice(0, 200).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "postgres://***")
        : "unknown";
  }

  const authUrl = (process.env.AUTH_URL ?? "").trim();
  const nextAuthUrl = (process.env.NEXTAUTH_URL ?? "").trim();
  const authUrlMasked = maskUrl(authUrl);
  const nextAuthUrlMasked = maskUrl(nextAuthUrl);

  return NextResponse.json(
    {
      now: new Date().toISOString(),
      runtime: {
        nodeEnv: process.env.NODE_ENV ?? null,
        onVercel: process.env.VERCEL === "1",
        vercelEnv: process.env.VERCEL_ENV ?? null,
        vercelRegion: process.env.VERCEL_REGION ?? null,
        requestHost: reqHost,
        requestProto: reqProto,
      },
      authEnv: {
        authUrl: authUrlMasked,
        nextAuthUrl: nextAuthUrlMasked,
        authUrlMatchesRequestHost:
          authUrlMasked.set && authUrlMasked.host === reqHost.split(":")[0]?.toLowerCase(),
        authUrlHasTrailingSlash: /\/$/.test(authUrl),
        authSecret: lengthInfo(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET),
      },
      dbEnv: {
        databaseUrl: maskUrl(process.env.DATABASE_URL),
        directUrl: maskUrl(process.env.DIRECT_URL),
        ping: { ok: dbOk, error: dbError },
      },
      providers: {
        googleSignIn: {
          configured: Boolean(google),
          clientIdTail: google ? google.clientId.slice(-10) : null,
          secretLength: google ? google.clientSecret.length : 0,
        },
        googleCalendar: {
          configured: Boolean(googleCalendar),
          clientIdTail: googleCalendar ? googleCalendar.clientId.slice(-10) : null,
          secretLength: googleCalendar ? googleCalendar.clientSecret.length : 0,
          usesDedicatedMeetClient: Boolean(process.env.GOOGLE_MEET_CLIENT_ID?.trim()),
        },
        linkedin: {
          configured: Boolean(linkedin),
          clientIdTail: linkedin ? linkedin.clientId.slice(-6) : null,
          secretLength: linkedin ? linkedin.clientSecret.length : 0,
        },
      },
      expectedOAuthCallbacks:
        authUrlMasked.set && authUrlMasked.host
          ? {
              google: `${authUrlMasked.scheme}://${authUrlMasked.host}${authUrlMasked.port ? ":" + authUrlMasked.port : ""}/api/auth/callback/google`,
              linkedin: `${authUrlMasked.scheme}://${authUrlMasked.host}${authUrlMasked.port ? ":" + authUrlMasked.port : ""}/api/auth/callback/linkedin`,
            }
          : null,
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store, private" },
    },
  );
}
