"use client";

import Image from "next/image";

import { BRAND_LOGO_SYMBOL_SRC, BRAND_LOGO_WORDMARK_SRC } from "@/lib/brand-assets";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  /** Navbar: compact. Footer: larger mark + wordmark for the cream band column. */
  context?: "navbar" | "footer";
};

/**
 * Mark + wordmark from `public/logo.svg` and `public/logo-text.svg`.
 */
export function BrandLogo({ className, priority = false, context = "navbar" }: BrandLogoProps) {
  const isFooter = context === "footer";

  const symbolClass = isFooter
    ? "h-[30px] w-auto shrink-0 object-contain object-left sm:h-[33px] md:h-9"
    : "h-[27px] w-auto shrink-0 object-contain object-left sm:h-[30px]";

  const wordmarkClass = isFooter
    ? "h-[21px] w-auto min-w-0 max-w-full shrink object-contain object-left sm:h-6 md:h-[27px] lg:h-[30px]"
    : "h-[18px] w-auto min-w-0 max-w-full shrink object-contain object-left sm:h-[21px] md:h-6";

  const gapClass = isFooter ? "gap-2 sm:gap-2.5 md:gap-3" : "gap-1.5 sm:gap-2";

  return (
    <span className={`inline-flex min-w-0 max-w-full items-center ${gapClass} ${className ?? ""}`}>
      <Image
        src={BRAND_LOGO_SYMBOL_SRC}
        alt=""
        width={40}
        height={39}
        priority={priority}
        className={symbolClass}
      />
      <Image
        src={BRAND_LOGO_WORDMARK_SRC}
        alt="Commonsia"
        width={182}
        height={40}
        priority={priority}
        className={wordmarkClass}
      />
    </span>
  );
}
