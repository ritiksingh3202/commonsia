import { SiteFooter } from "@/components/layout/SiteFooter";
import { Navbar } from "@/components/navbar/Navbar";

/**
 * Marketing pages wrapper. Intentionally no extra client-only shell — an empty client wrapper
 * (`MarketingChrome`) was triggering Turbopack "module factory is not available" on `/who-we-are`
 * in dev. Navbar remains a client component; this file stays a server component.
 */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-[50vh] w-full min-w-0 max-w-[100%] overflow-x-hidden pt-[var(--marketing-header-offset)]">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
