"use client";

import Image from "next/image";
import { useCallback, useState, type ReactNode } from "react";

import { isDefaultProfileCoverPath, profileCoverAspectStyle } from "@/lib/profile-cover";

export type ProfileCoverProps = {
  imageSrc: string;
  /** When the image is missing or fails, use this flat color instead of the default gradient (e.g. match avatar tint). */
  noImageTintBg?: string;
  alt?: string;
  priority?: boolean;
  readableGradient?: boolean;
  /** Extra bottom fade (edit strip). */
  stripBottomShade?: boolean;
  readableGradientClassName?: string;
  fullBleed?: boolean;
  className?: string;
  children?: ReactNode;
};

function isDataOrBlobUrl(src: string) {
  return src.startsWith("data:") || src.startsWith("blob:");
}

function isRemoteHttpUrl(src: string) {
  return src.startsWith("http://") || src.startsWith("https://");
}

export function ProfileCover({
  imageSrc,
  noImageTintBg,
  alt = "",
  priority = false,
  readableGradient = true,
  stripBottomShade = false,
  readableGradientClassName = "bg-gradient-to-t from-black/[0.38] via-black/[0.06] to-transparent",
  fullBleed = true,
  className,
  children,
}: ProfileCoverProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasSrc = Boolean(imageSrc?.trim());
  const showImage = hasSrc && failedSrc !== imageSrc;

  const onImgError = useCallback(() => setFailedSrc(imageSrc), [imageSrc]);

  /** Default asset must use a plain <img>: Next/Image + optimizer can fail on `/file.png?v=` and hid the cover until a custom upload “fixed” it. */
  const isDefaultCover = isDefaultProfileCoverPath(imageSrc);
  /**
   * Banner proxy routes (`/api/mentors/:id/banner?v=...`) already serve pre-compressed
   * JPEGs behind an immutable 1-year cache + ETag — pushing them through Next's image
   * optimizer just adds an extra hop (`/_next/image?url=/api/mentors/...`) that
   * re-encodes bytes we already sized on upload. Pipe them straight to the browser via
   * the plain `<img>` branch below instead.
   */
  const isApiProxyPath = imageSrc.startsWith("/api/mentors/");
  const useNextImage =
    showImage &&
    !isDefaultCover &&
    !isApiProxyPath &&
    !isDataOrBlobUrl(imageSrc) &&
    !isRemoteHttpUrl(imageSrc) &&
    imageSrc.startsWith("/");

  const aspect = profileCoverAspectStyle();

  // overflow-y-visible lets cover “Add new / Edit” menu open below the button without clipping.
  const inner = (
    <div className={`relative w-full overflow-x-hidden overflow-y-visible bg-neutral-200 ${className ?? ""}`} style={{ ...aspect }}>
      {!showImage ? (
        <div
          className={
            noImageTintBg
              ? "absolute inset-0 z-0"
              : "absolute inset-0 z-0 bg-gradient-to-br from-neutral-100 via-primary/[0.14] to-neutral-300"
          }
          style={noImageTintBg ? { backgroundColor: noImageTintBg } : undefined}
          aria-hidden
        />
      ) : null}

      {showImage ? (
        <div className="absolute inset-0 z-0 overflow-hidden">
          {useNextImage ? (
            <Image
              src={imageSrc}
              alt={alt}
              fill
              priority={priority}
              sizes="100vw"
              className="object-cover object-center"
              onError={onImgError}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- data/blob/remote URLs + default public cover
            <img
              src={imageSrc}
              alt={alt}
              className="absolute inset-0 size-full object-cover object-center"
              onError={onImgError}
            />
          )}
        </div>
      ) : null}

      {readableGradient ? (
        <div
          className={`pointer-events-none absolute inset-0 z-[2] ${readableGradientClassName}`}
          aria-hidden
        />
      ) : null}

      {stripBottomShade ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-10 bg-gradient-to-t from-black/25 to-transparent sm:h-14"
          aria-hidden
        />
      ) : null}

      {children}
    </div>
  );

  if (!fullBleed) return inner;

  return (
    <div className="relative w-full overflow-x-hidden">
      <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2">{inner}</div>
    </div>
  );
}
