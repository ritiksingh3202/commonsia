/**
 * Detects whether an architectural competition has a free or paid registration fee
 * from its title and description text.
 *
 * Priority:
 *  1. Explicit "free to enter / no entry fee" language → "free"
 *  2. Explicit fee amount or "registration/entry/submission fee" → "paid"
 *  3. Default → null (unknown — show nothing on the card)
 */
export function detectRegistrationFee(
  title: string,
  description: string,
): "free" | "paid" | null {
  const text = `${title} ${description}`.toLowerCase();

  // ── 1. Free indicators ────────────────────────────────────────────────────
  if (
    /\bfree\s+to\s+(enter|submit|participate|register)\b/.test(text) ||
    /\bno\s+(entry|registration|submission|participation)\s+fee\b/.test(text) ||
    /\b(entry|registration|submission)\s+fee\s*:\s*(none|free|nil|0|zero)\b/.test(text) ||
    /\bfree\s+(entry|registration|competition|submit)\b/.test(text) ||
    /\bopen\s+entry\b/.test(text) ||
    /\bno\s+fee\b/.test(text)
  ) {
    return "free";
  }

  // ── 2. Paid indicators ────────────────────────────────────────────────────
  // Explicit fee label (regardless of amount)
  if (
    /\b(entry|registration|submission|participation)\s+fee\b/.test(text) ||
    /\bfee\s*[:\-–]\s*[\$€£₹¥]/.test(text) ||
    /\bfee\s*[:\-–]\s*\d/.test(text)
  ) {
    return "paid";
  }
  // Currency symbol immediately followed by digits (but not near "prize" / "award")
  // e.g. "$50 registration" → paid; "$10,000 prize" → skip
  const currencyAmountRe = /[\$€£₹¥]\s*\d[\d,.]*/g;
  for (const m of text.matchAll(currencyAmountRe)) {
    const idx = m.index ?? 0;
    const surroundStart = Math.max(0, idx - 60);
    const surroundEnd = Math.min(text.length, idx + m[0].length + 60);
    const surround = text.slice(surroundStart, surroundEnd);
    // Skip if it looks like prize money
    if (/\b(prize|award|grant|stipend|reward)\b/.test(surround)) continue;
    return "paid";
  }

  // ── 3. Default ────────────────────────────────────────────────────────────
  return null;
}
