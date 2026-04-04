import { MarketingShell } from "@/components/layout/MarketingShell";

export default function MentorLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingShell>
      <div className="min-h-[50vh] bg-[#ffffff]">{children}</div>
    </MarketingShell>
  );
}
