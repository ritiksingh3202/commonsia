import { Navbar } from "@/components/navbar/Navbar";
import { SiteFooter } from "@/components/layout/SiteFooter";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-[50vh] w-full min-w-0 max-w-[100%] overflow-x-hidden">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
