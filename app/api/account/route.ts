import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Self-service account deletion was removed to avoid side effects on OAuth/session stability.
 * This handler remains so tooling and cached routes resolve cleanly; it does not touch the database.
 */
export async function DELETE() {
  return NextResponse.json(
    { error: "Account deletion is not available on this site. Use Log out, or contact support if you need help." },
    { status: 410 },
  );
}
