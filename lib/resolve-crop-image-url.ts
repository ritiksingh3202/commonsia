/**
 * Loads an image URL into a blob URL suitable for canvas cropping (avoids taint issues for remote URLs when possible).
 */
export async function resolveUrlForCanvasCrop(src: string): Promise<string> {
  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return src;
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error("Could not load image");
  const blob = await res.blob();
  if (!blob.type.startsWith("image/")) throw new Error("Not an image");
  return URL.createObjectURL(blob);
}
