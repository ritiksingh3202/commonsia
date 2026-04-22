/**
 * Shared compact scale for student setup (aligned with auth forms).
 * Mobile uses `text-base` (16px) to stop iOS Safari auto-zoom on focus;
 * `sm:text-[13px]` restores the compact desktop look from 640px up.
 */
export const setupField =
  "w-full rounded-md border border-black/10 bg-white px-2.5 py-2 text-base text-[#0a0a0a] placeholder:text-[#717182] outline-none transition-[box-shadow,border-color] focus:border-primary focus:ring-[1.5px] focus:ring-primary/20 sm:text-[13px]";

export const setupLabel = "text-[13px] font-medium text-[#0a0a0a]";

/**
 * Asterisk for required sections or fields.
 * Use a `<span>` (not `<abbr>`) so browsers don’t draw a dotted underline under the star.
 */
export const setupRequiredStar =
  "ml-0.5 inline font-semibold text-primary no-underline [text-decoration-line:none]";
