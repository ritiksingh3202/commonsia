import Link from "next/link";
import type { ReactNode } from "react";

export function LegalLayout({
  title,
  effectiveDateLabel,
  seeAlsoHref,
  seeAlsoLabel,
  children,
}: {
  title: string;
  effectiveDateLabel: string;
  seeAlsoHref: string;
  seeAlsoLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-gradient-to-b from-white via-white to-orange-50/25 pb-20 pt-8 sm:pt-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-[13px] text-neutral-600">
          <Link href="/" className="font-medium transition hover:text-primary">
            Home
          </Link>
          <span className="text-neutral-400" aria-hidden>
            /
          </span>
          <span className="font-medium text-[#0a0a0a]">{title}</span>
        </nav>

        <header className="rounded-2xl border border-black/[0.07] bg-white px-6 py-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:px-10 sm:py-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Legal</p>
          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-[#0a0a0a] sm:text-[1.75rem]">
            {title}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            <span className="font-medium text-neutral-800">Effective date:</span> {effectiveDateLabel}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={seeAlsoHref}
              className="inline-flex items-center justify-center rounded-xl border border-primary/35 bg-primary/5 px-4 py-2.5 text-[13px] font-semibold text-primary transition hover:bg-primary/10"
            >
              {seeAlsoLabel}
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-xl border border-black/[0.1] bg-white px-4 py-2.5 text-[13px] font-medium text-[#0a0a0a] transition hover:bg-neutral-50"
            >
              Contact us
            </Link>
          </div>
        </header>

        <article className="mt-8 rounded-2xl border border-black/[0.07] bg-white px-6 py-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:px-10 sm:py-10">
          <div className="legal-doc text-[15px] leading-relaxed text-neutral-800 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#0a0a0a] [&_li]:mt-2 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-4 [&_section]:mt-10 [&_section]:border-t [&_section]:border-neutral-100 [&_section]:pt-10 [&_section]:first:mt-0 [&_section]:first:border-t-0 [&_section]:first:pt-0 [&_strong]:font-semibold [&_strong]:text-[#0a0a0a] [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
            {children}
          </div>
        </article>
      </div>
    </div>
  );
}
