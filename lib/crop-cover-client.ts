import type { Area } from "react-easy-crop";

import {
  COVER_IMAGE_SIZE_LABEL,
  MAX_COVER_IMAGE_BYTES,
  MAX_PROFILE_IMAGE_BYTES,
  PROFILE_IMAGE_SIZE_LABEL,
  dataUrlByteLength,
} from "@/lib/profile-image-limits";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.src = src;
  });
}

const MAX_OUTPUT_WIDTH = 1920;

/**
 * Renders the cropped region to a JPEG data URL, scaled down if very large, then
 * progressively reduces JPEG quality until the encoded payload fits under the
 * 500 KB cover-photo cap. Throws with a user-friendly message if it still won't
 * compress enough at the lowest allowed quality.
 */
export async function getCroppedCoverDataUrl(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  let outW = pixelCrop.width;
  let outH = pixelCrop.height;
  if (outW > MAX_OUTPUT_WIDTH) {
    outH = Math.round((outH * MAX_OUTPUT_WIDTH) / outW);
    outW = MAX_OUTPUT_WIDTH;
  }

  canvas.width = outW;
  canvas.height = outH;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outW,
    outH,
  );

  let q = 0.9;
  let dataUrl = canvas.toDataURL("image/jpeg", q);
  while (dataUrlByteLength(dataUrl) > MAX_COVER_IMAGE_BYTES && q > 0.5) {
    q -= 0.07;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }
  if (dataUrlByteLength(dataUrl) > MAX_COVER_IMAGE_BYTES) {
    throw new Error(
      `Cover image is still larger than ${COVER_IMAGE_SIZE_LABEL} after compression. Try zooming out or pick a smaller source image.`,
    );
  }
  return dataUrl;
}

const MAX_AVATAR_OUTPUT = 512;

/**
 * Square profile photo crop → JPEG data URL, capped at 500 KB of encoded bytes
 * for API storage. Uses the same descending-quality loop as the cover helper so
 * the final file is as close to full 0.9 quality as the cap allows.
 */
export async function getCroppedAvatarDataUrl(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  let outW = pixelCrop.width;
  let outH = pixelCrop.height;
  const max = MAX_AVATAR_OUTPUT;
  if (Math.max(outW, outH) > max) {
    const scale = max / Math.max(outW, outH);
    outW = Math.round(outW * scale);
    outH = Math.round(outH * scale);
  }

  canvas.width = outW;
  canvas.height = outH;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outW,
    outH,
  );

  let q = 0.9;
  let dataUrl = canvas.toDataURL("image/jpeg", q);
  while (dataUrlByteLength(dataUrl) > MAX_PROFILE_IMAGE_BYTES && q > 0.45) {
    q -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }
  if (dataUrlByteLength(dataUrl) > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error(
      `Profile photo is still larger than ${PROFILE_IMAGE_SIZE_LABEL} after compression. Try zooming out or pick a smaller source image.`,
    );
  }
  return dataUrl;
}
