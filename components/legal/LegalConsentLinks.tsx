import Link from "next/link";

/** Compact line for auth cards: Terms + Privacy. */
export function LegalConsentLinks() {
  return (
    <p className="mt-4 text-center text-[11px] leading-relaxed text-[#717182] sm:text-[12px]">
      By continuing, you agree to our{" "}
      <Link href="/terms" className="font-medium text-primary hover:underline">
        Terms of Service
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="font-medium text-primary hover:underline">
        Privacy Policy
      </Link>
      .
    </p>
  );
}
