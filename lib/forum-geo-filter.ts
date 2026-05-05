/**
 * Geo-relevance filter for RSS-pulled forum posts.
 *
 * Returns true if the item is likely useful to users in India.
 *
 * Priority order:
 *  1. Explicit India / South-Asia mention  → always include
 *  2. Global / open-to-all language        → include
 *  3. Explicit citizenship restriction to a non-India country → skip
 *  4. Default                              → include (over-include beats missing real opps)
 */
export function isRelevantForIndianAudience(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();

  // ── 1. Explicit India / regional match ────────────────────────────────────
  if (
    /\bindia[n]?\b/.test(text) ||
    /\bsouth[\s-]?asia[n]?\b/.test(text) ||
    /\bsaarc\b/.test(text) ||
    /\b(new\s+delhi|mumbai|bengaluru|bangalore|chennai|hyderabad|kolkata|pune|ahmedabad)\b/.test(text)
  ) {
    return true;
  }

  // ── 2. Global / open-to-all language ──────────────────────────────────────
  if (
    /\ball\s+nationalities?\b/.test(text) ||
    /\bworldwide\b/.test(text) ||
    /\binternational\s+students?\b/.test(text) ||
    /\bopen\s+to\s+all\b/.test(text) ||
    /\bglobal(ly)?\b/.test(text) ||
    /\bdeveloping\s+countr(y|ies)\b/.test(text) ||
    /\bglobal\s+south\b/.test(text) ||
    /\bany\s+countr(y|ies)\b/.test(text) ||
    /\bcommonwealth\b/.test(text)    // India is a Commonwealth member
  ) {
    return true;
  }

  // ── 3. Explicit non-India citizenship / residency restrictions ─────────────
  // Only skip when the restriction is explicit — "US citizens only", not just "US".
  if (/\b(us|u\.s\.?|united\s+states?|american)\s+(citizens?|nationals?|residents?|only)\b/.test(text)) return false;
  if (/\b(uk|u\.k\.?|united\s+kingdom|british)\s+(citizens?|nationals?|residents?|only)\b/.test(text)) return false;
  if (/\b(eu|european\s+union|european)\s+(citizens?|nationals?|residents?)\b/.test(text)) return false;
  if (/\baustralian\s+(citizens?|nationals?|residents?)\b/.test(text)) return false;
  if (/\bcanadian\s+(citizens?|nationals?|residents?)\b/.test(text)) return false;
  if (/\bnew\s+zealand(er)?\s+(citizens?|nationals?|residents?)\b/.test(text)) return false;

  // ── 4. Default: include ────────────────────────────────────────────────────
  return true;
}
