import Image from "next/image";
import type { ReactNode } from "react";

/** Social glyphs from `public/` — rendered black via `.icon-black-line`. */
const WHATSAPP = "/whatsapp.svg";
const LINKEDIN = "/linkedin.svg";
const INSTAGRAM = "/instagram.svg";

const iconClass = "icon-black-line size-5 max-h-5 max-w-5 object-contain";

/** Shared with student + mentor profile heroes — icons only, no circular background. */
export function SocialIconButton({
  href,
  label,
  icon,
  className,
}: {
  href: string | null;
  label: string;
  icon: ReactNode;
  /** e.g. circular shell to match edit / messages buttons on profile toolbar */
  className?: string;
}) {
  const shell = ["inline-flex items-center justify-center transition", className].filter(Boolean).join(" ");
  if (!href?.trim()) {
    return (
      <span
        className={`${shell} cursor-not-allowed opacity-35`}
        title={`Add ${label} in Edit profile → Personal`}
        aria-hidden
      >
        {icon}
      </span>
    );
  }
  return (
    <a
      href={href.trim()}
      target="_blank"
      rel="noopener noreferrer"
      className={shell}
      aria-label={label}
    >
      {icon}
    </a>
  );
}

export function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <Image
      src={WHATSAPP}
      alt=""
      width={20}
      height={20}
      sizes="20px"
      className={[iconClass, className].filter(Boolean).join(" ")}
    />
  );
}

export function LinkedInGlyph({
  className,
  /** Larger in toolbar circles so the glyph matches edit / message weight */
  profileToolbar,
  /** True = site primary (globals `.icon-brand-line`). False = black glyph for footer etc. */
  brandColor,
}: {
  className?: string;
  profileToolbar?: boolean;
  brandColor?: boolean;
}) {
  const dim = profileToolbar ? 22 : 20;
  const sizeClass = brandColor
    ? profileToolbar
      ? "icon-brand-line size-[22px] max-h-[22px] max-w-[22px] object-contain"
      : "icon-brand-line size-5 max-h-5 max-w-5 object-contain"
    : profileToolbar
      ? "icon-black-line size-[22px] max-h-[22px] max-w-[22px] object-contain"
      : iconClass;
  return (
    <Image
      src={LINKEDIN}
      alt=""
      width={dim}
      height={dim}
      sizes={`${dim}px`}
      className={[sizeClass, className].filter(Boolean).join(" ")}
    />
  );
}

export function InstagramGlyph({ className }: { className?: string }) {
  return (
    <Image
      src={INSTAGRAM}
      alt=""
      width={20}
      height={20}
      sizes="20px"
      className={[iconClass, className].filter(Boolean).join(" ")}
    />
  );
}
