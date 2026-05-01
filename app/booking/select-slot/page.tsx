import { redirect } from "next/navigation";

import { verifyCatalogAccessSignedToken } from "@/lib/booking-slot-pick-token";

export const metadata = {
  title: "Pick session time · Commonsia",
};

type PageProps = { searchParams: Promise<{ token?: string }> };

/**
 * Legacy path: `/booking/select-slot?token=…` redirects to `/select-slot?bookingId=…&token=…`
 * so WhatsApp catalog URLs match production host + path shape.
 */
export default async function BookingSelectSlotRedirect(props: PageProps) {
  const sp = await props.searchParams;
  const token = typeof sp.token === "string" ? sp.token.trim() : "";
  if (!token) {
    redirect("/select-slot");
  }
  const verified = verifyCatalogAccessSignedToken(token);
  if (!verified.ok) {
    redirect("/select-slot");
  }
  redirect(`/select-slot?bookingId=${encodeURIComponent(verified.bookingRequestId)}&token=${encodeURIComponent(token)}`);
}
