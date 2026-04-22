/**
 * Human-readable mentor profile URLs.
 *
 * Design goals:
 *   1. URL shows the mentor's name (`/mentors/abdul-rehman-u1odqo`).
 *   2. Old raw-id URLs (`/mentors/cmo9m22g00002jy04tju1odqo`) keep working — important because
 *      shared links, past emails, cached Google results etc. are already out in the wild.
 *   3. Lookup is O(1) off the Redis-cached mentors list — no extra DB calls.
 *   4. Zero database schema changes (we don't persist slugs; they're derived from `name` + `id`).
 *
 * The slug format is `{slugified-name}-{last-6-chars-of-id}`. Appending the id suffix keeps each
 * URL unique even if two mentors share a name and lets us resolve a URL back to a mentor by
 * matching `id.endsWith(suffix)` against the cached list.
 */

export function slugifyMentorName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    /** Strip diacritics (café → cafe) so the URL stays pure ASCII. */
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Short tail from the CUID so two mentors named "Abdul Rehman" get distinct URLs. */
export function mentorIdSuffix(id: string): string {
  return id.slice(-6);
}

/** Canonical URL slug for a mentor — name + 6-char id tail. */
export function mentorProfileSlug(mentor: { id: string; name: string }): string {
  const name = slugifyMentorName(mentor.name ?? "");
  const tail = mentorIdSuffix(mentor.id);
  if (!name) return mentor.id;
  return `${name}-${tail}`;
}

/** `/mentors/<slug>` for an active mentor; never throws. */
export function mentorProfileHref(mentor: { id: string; name: string }): string {
  return `/mentors/${mentorProfileSlug(mentor)}`;
}

/** CUID-ish shape Supabase/Prisma emits — used to detect legacy raw-id URLs. */
export function looksLikeRawMentorId(param: string): boolean {
  return /^c[a-z0-9]{20,}$/i.test(param);
}

/**
 * Given a URL param like `abdul-rehman-u1odqo`, returns the trailing id tail (`u1odqo`).
 * Returns null if the param doesn't fit the name-dash-tail shape.
 */
export function extractMentorIdSuffixFromSlug(param: string): string | null {
  const m = param.match(/-([a-z0-9]{4,})$/i);
  return m ? m[1] : null;
}
