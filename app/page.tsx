import { HomePage } from "@/components/home/HomePage";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { getHomeTestimonials } from "@/lib/testimonials";

/** ISR fallback; testimonials also use `unstable_cache` + tag `home-testimonials` (busted on new reviews). */
export const revalidate = 120;

export default async function Home() {
  const testimonials = await getHomeTestimonials();
  return (
    <MarketingShell>
      <HomePage testimonials={testimonials} />
    </MarketingShell>
  );
}
