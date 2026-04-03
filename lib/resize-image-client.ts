/**
 * Client-only: compress an image file to a JPEG data URL for profile storage.
 */
export async function compressImageToDataUrl(
  file: File,
  opts: { maxEdge: number; quality: number; maxChars?: number },
): Promise<string> {
  const { maxEdge, quality, maxChars = 450_000 } = opts;

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
  while (dataUrl.length > maxChars && q > 0.45) {
    q -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }
  if (dataUrl.length > maxChars) {
    throw new Error("Image is still too large after compression. Try a smaller file.");
  }
  return dataUrl;
}
