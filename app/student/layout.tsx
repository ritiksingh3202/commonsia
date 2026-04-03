import { MarketingShell } from "@/components/layout/MarketingShell";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingShell>
      <div className="min-h-[50vh] bg-neutral-50/90">{children}</div>
    </MarketingShell>
  );
}
