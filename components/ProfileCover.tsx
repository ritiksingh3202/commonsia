"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type ReactNode } from "react";

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
  const [failed, setFailed] = useState(false);
  const hasSrc = Boolean(imageSrc?.trim());
  const showImage = hasSrc && !failed;

  const onImgError = useCallback(() => setFailed(true), []);

  /** Default asset must use a plain <img>: Next/Image + optimizer can fail on `/file.png?v=` and hid the cover until a custom upload “fixed” it. */
  const isDefaultCover = isDefaultProfileCoverPath(imageSrc);
  const useNextImage =
    showImage &&
    !isDefaultCover &&
    !isDataOrBlobUrl(imageSrc) &&
    !isRemoteHttpUrl(imageSrc) &&
    imageSrc.startsWith("/");

  useEffect(() => {
    setFailed(false);
  }, [imageSrc]);

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
