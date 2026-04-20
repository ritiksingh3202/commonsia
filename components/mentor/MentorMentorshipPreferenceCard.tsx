"use client";

type MentorMentorshipPreferenceCardProps = {
  fieldId: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: () => void;
  cardClassName: string;
};

/**
 * Custom checkbox styling: white check on primary fill (native `accent-color` ticks stay dark in Chrome).
 */
export function MentorMentorshipPreferenceCard({
  fieldId,
  title,
  description,
  checked,
  onCheckedChange,
  cardClassName,
}: MentorMentorshipPreferenceCardProps) {
  return (
    <label
      htmlFor={fieldId}
      className={`${cardClassName} has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/35 has-[:focus-visible]:ring-offset-2`}
    >
      <span
        aria-hidden
        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
          checked ? "border-primary bg-primary" : "border-neutral-300 bg-white"
        }`}
      >
        <svg viewBox="0 0 12 12" className="size-2.5" fill="none" aria-hidden>
          <path
            d="M2.5 6L5 8.5L9.5 3.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={checked ? "opacity-100" : "opacity-0"}
          />
        </svg>
      </span>
      <input
        id={fieldId}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={() => onCheckedChange()}
      />
      <span className="min-w-0 text-left">
        <span className="block text-[13px] font-semibold text-[#0a0a0a] sm:text-sm">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-[#6b7280]">{description}</span>
      </span>
    </label>
  );
}
