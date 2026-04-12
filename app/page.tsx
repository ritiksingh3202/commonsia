import { HomePage } from "@/components/home/HomePage";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { getHomeTestimonials } from "@/lib/testimonials";

/** Fresh testimonials after students submit session reviews (`revalidatePath("/")`). */
export const dynamic = "force-dynamic";

export default async function Home() {
  const testimonials = await getHomeTestimonials();
  return (
    <MarketingShell>
      <HomePage testimonials={testimonials} />
    </MarketingShell>
  );
}
