import { SelectSlotExperience } from "@/components/booking/SelectSlotExperience";
import { loadSelectSlotPickerState } from "@/lib/booking-slot-selection-data";

export const metadata = {
  title: "Pick session time · Commonsia",
};

type PageProps = { searchParams: Promise<{ bookingId?: string; token?: string }> };

export default async function SelectSlotPage(props: PageProps) {
  const sp = await props.searchParams;
  const bookingId = typeof sp.bookingId === "string" ? sp.bookingId.trim() : "";
  const token = typeof sp.token === "string" ? sp.token.trim() : "";

  const loaded = await loadSelectSlotPickerState(bookingId, token);

  if (loaded.kind === "notice") {
    return <SelectSlotNotice title={loaded.title} message={loaded.message} />;
  }

  return <SelectSlotExperience initialPayload={loaded.payload} />;
}

function SelectSlotNotice({ title, message }: { title: string; message: string }) {
  return (
    <main className="min-h-[100dvh] bg-[#fafafa] px-4 py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-black/[0.08] bg-white px-5 py-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Commonsia</p>
        <h1 className="mt-2 font-heading text-lg font-semibold text-[#b45309]">{title}</h1>
        <p className="mt-2 text-[13px] leading-snug text-neutral-700">{message}</p>
      </div>
    </main>
  );
}
