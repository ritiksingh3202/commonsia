import { NextResponse } from "next/server";

import { finalizeBookingRequestSlotPick } from "@/lib/booking-request-finalize";
import { verifyCatalogAccessSignedToken } from "@/lib/booking-slot-pick-token";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, title: "Bad request", message: "Expected JSON body." }, { status: 400 });
  }

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const bookingRequestId = typeof o.bookingRequestId === "string" ? o.bookingRequestId.trim() : "";
  const catalogToken = typeof o.catalogToken === "string" ? o.catalogToken.trim() : "";
  const slotStartISO = typeof o.slotStartISO === "string" ? o.slotStartISO.trim() : "";

  if (!bookingRequestId || !catalogToken || !slotStartISO) {
    return NextResponse.json(
      { ok: false, title: "Missing fields", message: "bookingRequestId, catalogToken, and slotStartISO are required." },
      { status: 400 },
    );
  }

  const verified = verifyCatalogAccessSignedToken(catalogToken);
  if (!verified.ok || verified.bookingRequestId !== bookingRequestId) {
    return NextResponse.json(
      { ok: false, title: "Unauthorized", message: "This session link is invalid or does not match the booking." },
      { status: 401 },
    );
  }

  const result = await finalizeBookingRequestSlotPick({
    bookingRequestId,
    rawToken: verified.rawToken,
    slotStartISO,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
