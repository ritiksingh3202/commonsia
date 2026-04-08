/**
 * Parse a `data:mime;base64,...` URL into raw bytes (for serving stored uploads).
 */
export function parseDataUrlToBuffer(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const s = dataUrl.trim();
  const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(s);
  if (!m) return null;
  const mime = m[1].trim() || "application/octet-stream";
  try {
    const buffer = Buffer.from(m[2], "base64");
    return { buffer, mime };
  } catch {
    return null;
  }
}
