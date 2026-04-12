"use client";

/**
 * Read-only portfolio area for viewers (mentor sees student, etc.).
 * Opens the uploaded PDF/ZIP via authenticated GET, or external URL in a new tab.
 */
export function PortfolioViewerPanel({
  userId,
  portfolioUrl,
  portfolioFileName,
  portfolioVisibleToOthers,
  className,
}: {
  userId: string;
  portfolioUrl: string | null;
  portfolioFileName: string | null;
  portfolioVisibleToOthers: boolean;
  /** Merged onto the root; default includes top margin for standalone use. */
  className?: string;
}) {
  const hasFile = Boolean(portfolioFileName?.trim());
  const url = portfolioUrl?.trim() ?? "";
  const hasUrl = url.length > 0 && /^https?:\/\//i.test(url);

  if (!hasFile && !hasUrl) return null;

  const docHref = `/api/profile/${encodeURIComponent(userId)}/portfolio`;

  return (
    <div className={`mt-6 rounded-2xl border border-black/[0.08] bg-neutral-50/90 p-4 sm:p-5${className ? ` ${className}` : ""}`}>
      <h2 className="text-sm font-semibold text-[#0a0a0a] sm:text-base">Portfolio</h2>
      <p className="mt-1 text-[12px] leading-relaxed text-[#6b7280] sm:text-[13px]">
        {hasFile && hasUrl
          ? "Uploaded PDF/ZIP and an external link. Use the buttons below."
          : hasFile
            ? "Uploaded work (PDF or ZIP). Opens in the browser or your viewer."
            : "External portfolio link shared by this profile."}
      </p>

      {!portfolioVisibleToOthers && (hasFile || hasUrl) ? (
        <p className="mt-3 text-[13px] text-[#6b7280]">
          They have turned off sharing their portfolio document or link with others on Commonsia.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {hasFile && portfolioVisibleToOthers ? (
            <a
              href={docHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-center text-[13px] font-semibold text-white shadow-sm ring-1 ring-primary/20 transition hover:bg-primary/90"
            >
              Open portfolio document
            </a>
          ) : null}
          {hasUrl && portfolioVisibleToOthers ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center rounded-xl border border-primary/30 bg-white px-4 py-2.5 text-center text-[13px] font-semibold text-primary transition hover:bg-primary/5 ${
                hasFile ? "sm:ml-0" : ""
              }`}
            >
              Open portfolio website
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
