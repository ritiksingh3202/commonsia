"use client";

import { ARCHITECTURE_INTEREST_GROUPS } from "@/components/shared/architecture-taxonomy";

const sectionTitle =
  "text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-400 sm:text-xs";
const sectionRule = "mt-2 border-t border-neutral-200";
export const architecturePillBase =
  "rounded-full border px-4 py-2 text-center text-sm font-medium transition";
const pillOffDefault = "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400";
const pillOnDefault = "border-primary bg-primary/5 text-[#0a0a0a] ring-1 ring-primary/25";

type Props = {
  selected: Set<string>;
  onToggle: (label: string) => void;
  /** Override default pill styles (e.g. mentor edit uses rounded-xl chips elsewhere) */
  classNameOn?: string;
  classNameOff?: string;
};

export function ArchitectureGroupedPills({
  selected,
  onToggle,
  classNameOn = pillOnDefault,
  classNameOff = pillOffDefault,
}: Props) {
  return (
    <>
      {ARCHITECTURE_INTEREST_GROUPS.map((group) => (
        <div key={group.title} className="mb-8 last:mb-0">
          <h3 className={sectionTitle}>{group.title}</h3>
          <div className={sectionRule} aria-hidden />
          <div className="mt-4 flex flex-wrap gap-3">
            {group.items.map((label) => {
              const isOn = selected.has(label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onToggle(label)}
                  className={`${architecturePillBase} ${isOn ? classNameOn : classNameOff}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

export const architectureOthersSectionTitle = sectionTitle;
export const architectureOthersSectionRule = sectionRule;
