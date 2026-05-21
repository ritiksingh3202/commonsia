/**
 * Competition open-call filter.
 *
 * The competitions feed should only show OPEN CALLS — live competitions
 * where students/architects can register and submit entries.
 *
 * Filter OUT:
 *   - Results / winners announcements ("winner announced", "shortlist revealed")
 *   - Project showcases and award recaps ("best of", "top 10 designs")
 *   - Completed competition coverage ("winning design for X unveiled")
 *
 * Filter IN:
 *   - Open-call announcements ("call for entries", "submissions open", "deadline")
 *   - Competition briefs ("design a ...", "proposals invited", "register now")
 *   - Student competition opportunities ("open to students", "student award")
 *
 * Default: INCLUDE (when ambiguous, a genuine open call is more likely than a
 * random showcase — the arch filter already blocks non-architecture content).
 */
export function isOpenCompetitionCall(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();

  // ── 1. Hard reject — clear results/showcase/retrospective signals ──────────
  const isResult = (
    /\b(winner[s]?\s+(announced|revealed|named|selected|of\s+the)|announcing\s+the\s+winner)/i.test(text) ||
    /\b(shortlist(ed)?\s+(announced|revealed|released)|finalists?\s+(announced|revealed|named))/i.test(text) ||
    /\b(results?\s+(are\s+)?(in|out|announced|revealed|here)|competition\s+results?)\b/i.test(text) ||
    /\b(award\s+goes\s+to|prize\s+goes\s+to|top\s+prize\s+to)\b/i.test(text) ||
    /\b(winning\s+(design|entry|project|proposal)\s+(revealed|unveiled|announced|for))/i.test(text) ||
    /\b(best\s+of\s+20\d\d|top\s+\d+\s+(design|project|submission)s?)\b/i.test(text) ||
    /\b(review[s]?\s+of\s+submissions?|jury\s+selection\s+(complete|done|finished))\b/i.test(text)
  );
  if (isResult) return false;

  // ── 2. Strong accept — explicit open-call language ────────────────────────
  const isOpenCall = (
    /\b(call\s+for\s+(entries|submissions?|proposals?|ideas?|applications?|participants?|designs?))\b/i.test(text) ||
    /\b(open\s+call|open\s+competition|open\s+to\s+(all|students?|architects?|designers?|the\s+public))\b/i.test(text) ||
    /\b(submission[s]?\s+(deadline|open|close[ds]?|due|period|window))\b/i.test(text) ||
    /\b(register\s+(now|today|online|here|to\s+participate)|registration\s+(open[s]?|now\s+open|deadline))\b/i.test(text) ||
    /\b(entry\s+(deadline|fee|period|open)|entries?\s+(open|close|due|accepted))\b/i.test(text) ||
    /\b(deadline[s]?\s*:\s*\w|\bdeadline\s+is\s+|\bdeadline\s+for\s+)\b/i.test(text) ||
    /\b(tasks?\s+(designers?|architects?|students?|participants?|teams?)\s+(to|with))\b/i.test(text) ||
    /\b(invite[sd]?\s+(architects?|designers?|students?|teams?|proposals?))\b/i.test(text) ||
    /\b(seeking\s+(proposals?|entries?|designs?|ideas?|submissions?))\b/i.test(text) ||
    /\b(participate|how\s+to\s+enter|enter\s+(the\s+)?competition|submit\s+your\s+(design|proposal|entry))\b/i.test(text) ||
    /\b(prize[s]?\s*(of|worth|valued?|up\s+to)?[\s$€£₹]\d)/i.test(text) ||
    /\b(student\s+competition|student\s+award|youth\s+competition|academic\s+competition)\b/i.test(text)
  );
  if (isOpenCall) return true;

  // ── 3. Default: exclude — ambiguous items should not appear in Competitions.
  //    Only items with explicit open-call language are shown.
  return false;
}
