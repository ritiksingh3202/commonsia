import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { isValidEmailAddress } from "@/lib/email-validation";
import { invalidatePublicMentorsList } from "@/lib/redis-cache";
import { isPrismaConnectionError, isPrismaMissingSchemaError } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";

const MIN_PASSWORD = 8;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const emailRaw = typeof b.email === "string" ? b.email.trim() : "";
  const email = emailRaw.toLowerCase();
  const password = typeof b.password === "string" ? b.password : "";
  const role = b.role === "mentor" ? "mentor" : "student";

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
  }
  if (!isValidEmailAddress(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD} characters.` },
      { status: 400 },
    );
  }

  try {
    // Run the email check and password hashing in parallel to cut registration time roughly in half.
    const [existing, passwordHash] = await Promise.all([
      prisma.user.findFirst({ where: { email } }),
      bcrypt.hash(password, 10),
    ]);
    if (existing) {
      if (!existing.passwordHash) {
        return NextResponse.json(
          {
            error:
              "This email is already registered with Google or LinkedIn. Sign in with that provider.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
    });
  } catch (e) {
    console.error("[api/auth/register]", e);
    if (isPrismaMissingSchemaError(e)) {
      return NextResponse.json(
        {
          error:
            "The database is missing required tables or columns. From your machine, run `npx prisma db push` or `npx prisma migrate deploy` against this project’s Supabase `DATABASE_URL`, then try again.",
        },
        { status: 503 },
      );
    }
    if (isPrismaConnectionError(e)) {
      return NextResponse.json(
        { error: "We could not reach the database. Check DATABASE_URL on the server and try again." },
        { status: 503 },
      );
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Something went wrong while creating your account. Please try again in a moment." },
      { status: 500 },
    );
  }

  if (role === "mentor") {
    invalidatePublicMentorsList();
  }

  return NextResponse.json({ ok: true });
}
