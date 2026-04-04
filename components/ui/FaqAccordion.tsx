export type FaqItem = { q: string; a: string };

/** Simple FAQ list — native details/summary, white surface, light borders. */
export function FaqAccordion({
  items,
  className,
}: {
  items: readonly FaqItem[];
  className?: string;
}) {
  return (
    <div className={className}>
      <ul className="overflow-hidden rounded-xl border border-black/[0.08] bg-[#ffffff]">
        {items.map((item, i) => (
          <li key={`${i}-${item.q.slice(0, 24)}`} className="border-b border-black/[0.06] last:border-b-0">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-left text-[15px] font-semibold leading-snug text-[#0a0a0a] marker:content-none sm:px-5 sm:py-4 sm:text-base [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">{item.q}</span>
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border border-black/[0.08] text-lg leading-none text-primary transition-transform duration-200 group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <div className="border-t border-black/[0.05] px-4 pb-4 pt-3 text-left text-sm leading-relaxed text-neutral-600 sm:px-5 sm:text-[15px]">
                {item.a}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
