import { SiteFooter } from "@/components/layout/SiteFooter";
import { MarketingChrome } from "@/components/layout/MarketingChrome";
import { Navbar } from "@/components/navbar/Navbar";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <MarketingChrome>
      <Navbar />
      <main className="min-h-[50vh] w-full min-w-0 max-w-[100%] overflow-x-hidden pt-[var(--marketing-header-offset)]">
        {children}
      </main>
      <SiteFooter />
    </MarketingChrome>
  );
}
