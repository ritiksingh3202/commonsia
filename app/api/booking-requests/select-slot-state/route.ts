import { NextResponse } from "next/server";

import { loadSelectSlotPickerState } from "@/lib/booking-slot-selection-data";

export const runtime = "nodejs";

/** Lets the slot picker poll for overlapping bookings disabling starts (Supabase Realtime not wired — polling substitute). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const bookingId = url.searchParams.get("bookingId")?.trim() ?? "";
  const token = url.searchParams.get("token")?.trim() ?? "";

  const loaded = await loadSelectSlotPickerState(bookingId, token);
  if (loaded.kind === "notice") {
    return NextResponse.json({ ok: false, notice: loaded }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ ok: true, payload: loaded.payload }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
