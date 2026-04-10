/**
 * LinkedIn "Sign in with LinkedIn using OpenID Connect" only returns lite claims
 * (name, photo, email, locale). Headline, company, cover, phone, and bio are not available
 * with the same app product/scopes — they require separate LinkedIn API programs (often partner-gated).
 */
export function SetupLinkedInNotice({ variant }: { variant: "student" | "mentor" }) {
  return (
    <div
      className="mb-4 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-[12px] leading-snug text-amber-950 sm:text-[13px]"
      role="note"
    >
      <p className="font-semibold text-amber-900">Signed in with LinkedIn</p>
      <p className="mt-1 text-amber-900/90">
        We can only auto-fill <strong>name</strong>, <strong>profile photo</strong>, and <strong>email</strong> from
        LinkedIn with your current permissions.{" "}
        {variant === "mentor"
          ? "Job title, organization, cover image, phone, and bio are not exposed by LinkedIn’s OpenID API — please enter those here."
          : "School, location, phone, and longer bio are not exposed by LinkedIn’s OpenID API — please complete those steps manually."}{" "}
        Your answers are saved as you type.
      </p>
    </div>
  );
}
