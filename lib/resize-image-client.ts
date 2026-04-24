import {
  MAX_PROFILE_IMAGE_BYTES,
  PROFILE_IMAGE_SIZE_LABEL,
  dataUrlByteLength,
  formatBytesShort,
} from "@/lib/profile-image-limits";

/**
 * Client-only: compress an image file to a JPEG data URL for profile storage.
 *
 * The size ceiling is measured in **decoded JPEG bytes** (not data URL string
 * length), and defaults to the shared profile-photo cap (`MAX_PROFILE_IMAGE_BYTES`,
 * currently 500 KB). Callers that need a different ceiling (e.g. a larger banner
 * image) can override `maxBytes`; anything stricter than the platform cap is
 * fine, anything laxer should consult `PROFILE_IMAGE_SIZE_LABEL` for messaging.
 */
export async function compressImageToDataUrl(
  file: File,
  opts: { maxEdge: number; quality: number; maxBytes?: number },
): Promise<string> {
  const { maxEdge, quality, maxBytes = MAX_PROFILE_IMAGE_BYTES } = opts;

  const bitmap = await createImageBitmap(file);
  const w = bitmap.width;
  const h = bitmap.height;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, cw, ch);
  bitmap.close();

  let q = quality;
  let dataUrl = canvas.toDataURL("image/jpeg", q);
  while (dataUrlByteLength(dataUrl) > maxBytes && q > 0.45) {
    q -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }
  const finalBytes = dataUrlByteLength(dataUrl);
  if (finalBytes > maxBytes) {
    const label = maxBytes === MAX_PROFILE_IMAGE_BYTES ? PROFILE_IMAGE_SIZE_LABEL : formatBytesShort(maxBytes);
    throw new Error(
      `Image is still larger than ${label} after compression (${formatBytesShort(finalBytes)}). Try a smaller file.`,
    );
  }
  return dataUrl;
}
