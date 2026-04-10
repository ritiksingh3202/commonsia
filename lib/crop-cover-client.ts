import type { Area } from "react-easy-crop";

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
 * Renders the cropped region to a JPEG data URL, scaled down if very large.
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
  while (dataUrl.length > 450_000 && q > 0.5) {
    q -= 0.07;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }
  if (dataUrl.length > 450_000) {
    throw new Error("Cropped image is still too large. Try zooming out slightly and crop again.");
  }
  return dataUrl;
}
