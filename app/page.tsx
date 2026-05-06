import { HomePage } from "@/components/home/HomePage";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { getHomeTestimonials } from "@/lib/testimonials";
import { getHomepageStats } from "@/lib/homepage-stats";

/** ISR fallback; testimonials also use `unstable_cache` + tag `home-testimonials` (busted on new reviews). */
export const revalidate = 120;

export default async function Home() {
  const [testimonials, stats] = await Promise.all([
    getHomeTestimonials(),
    getHomepageStats(),
  ]);
  return (
    <MarketingShell>
      <HomePage testimonials={testimonials} stats={stats} />
    </MarketingShell>
  );
}
