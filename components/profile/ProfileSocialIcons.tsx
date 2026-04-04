import Image from "next/image";
import type { ReactNode } from "react";

/** Home marketing SVGs (`public/home_assets/*`) — paths use primary fill `#ff571f`. */
const WHATSAPP = "/home_assets/whatsapp.svg";
const LINKEDIN = "/home_assets/linkedin.svg";
const INSTAGRAM = "/home_assets/instagram.svg";

const iconClass = "size-5 max-h-5 max-w-5 object-contain";

/** Shared with student + mentor profile heroes — icons only, no circular background. */
export function SocialIconButton({
  href,
  label,
  icon,
}: {
  href: string | null;
  label: string;
  icon: ReactNode;
}) {
  const shell =
    "inline-flex items-center justify-center transition hover:opacity-80";
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
      className={[iconClass, className].filter(Boolean).join(" ")}
    />
  );
}

export function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <Image
      src={LINKEDIN}
      alt=""
      width={20}
      height={20}
      className={[iconClass, className].filter(Boolean).join(" ")}
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
      className={[iconClass, className].filter(Boolean).join(" ")}
    />
  );
}
