"use client";

import { useState } from "react";

import { WipComingSoonModal, type WipComingSoonVariant } from "@/components/shared/WipComingSoonModal";

const card =
  "rounded-[14px] border border-black/10 bg-white p-4 shadow-sm sm:p-5";

export function MentorDashboardQuickActions() {
  const [wip, setWip] = useState<WipComingSoonVariant | null>(null);

  return (
    <>
      <WipComingSoonModal variant={wip} onClose={() => setWip(null)} />
      <section className={card}>
        <h3 className="text-base font-medium text-[#0a0a0a]">Quick Actions</h3>
        <div className="mt-4 flex flex-col gap-2.5">
          <button
            type="button"
            className="h-8 w-full rounded-lg bg-primary text-[14px] font-medium text-white shadow-sm transition hover:bg-primary/90"
          >
            Schedule Session
          </button>
          <button
            type="button"
            onClick={() => setWip("discussion")}
            className="h-8 w-full rounded-lg border border-black/10 bg-white text-[14px] font-medium text-[#0a0a0a] transition hover:bg-neutral-50"
          >
            Join Discussion
          </button>
          <button
            type="button"
            className="h-8 w-full rounded-lg border border-black/10 bg-white text-[14px] font-medium text-[#0a0a0a] hover:bg-neutral-50"
          >
            Create Resource
          </button>
        </div>
      </section>
    </>
  );
}
