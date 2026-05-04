export const FORUM_CATEGORIES = [
  { slug: "bachelors", label: "Bachelors", accent: "#2563eb" },
  { slug: "masters", label: "Masters", accent: "#16a34a" },
  { slug: "phd", label: "PhD", accent: "#7c3aed" },
  { slug: "faculty", label: "Faculty / Project Proposals", accent: "#ea580c" },
  { slug: "startup", label: "Startup Calls", accent: "#db2777" },
] as const;

export type ForumCategorySlug = (typeof FORUM_CATEGORIES)[number]["slug"];

const SLUG_SET = new Set<string>(FORUM_CATEGORIES.map((c) => c.slug));

export function isValidCategorySlug(s: string | null | undefined): s is ForumCategorySlug {
  return typeof s === "string" && SLUG_SET.has(s);
}

export function categoryMeta(slug: string | null | undefined) {
  return FORUM_CATEGORIES.find((c) => c.slug === slug) ?? null;
}

const HASHTAG_MAP: Record<string, ForumCategorySlug> = {
  bachelor: "bachelors",
  bachelors: "bachelors",
  undergrad: "bachelors",
  undergraduate: "bachelors",
  ug: "bachelors",
  master: "masters",
  masters: "masters",
  pg: "masters",
  postgrad: "masters",
  postgraduate: "masters",
  phd: "phd",
  doctorate: "phd",
  doctoral: "phd",
  faculty: "faculty",
  proposal: "faculty",
  proposals: "faculty",
  research: "faculty",
  startup: "startup",
  startups: "startup",
  founder: "startup",
  incubator: "startup",
  accelerator: "startup",
};

/**
 * Pick a category from text. Order:
 *   1. Explicit hashtag (e.g. `#phd`) — highest confidence; tag is also stripped from the
 *      returned text so it doesn't clutter the post body on the feed.
 *   2. Keyword scan over the full text — used by both the WhatsApp inbound parser and the
 *      RSS puller so cron-pulled items get categorized too. Specific terms beat general
 *      ones (startup > phd > masters > bachelors > faculty) when multiple match.
 *
 * Returns the matched category and the cleaned text (hashtag removed if any).
 */
export function classifyForumPostText(rawText: string | null | undefined): {
  category: ForumCategorySlug | null;
  cleanedText: string | null;
} {
  const text = rawText?.trim() ?? "";
  if (!text) return { category: null, cleanedText: null };

  // 1. Explicit hashtag wins.
  const tagRe = /#([a-z]+)\b/gi;
  let hashtagCategory: ForumCategorySlug | null = null;
  let cleanedText = text;
  for (const m of text.matchAll(tagRe)) {
    const slug = HASHTAG_MAP[m[1].toLowerCase()];
    if (slug && !hashtagCategory) {
      hashtagCategory = slug;
      cleanedText = cleanedText.replace(m[0], "").replace(/\s{2,}/g, " ").trim();
    }
  }
  if (hashtagCategory) return { category: hashtagCategory, cleanedText: cleanedText || null };

  // 2. Keyword scan, in priority order — specific terms first, then broader fallbacks.
  const lower = text.toLowerCase();
  const has = (re: RegExp) => re.test(lower);

  /** Tier 1 — explicit level keywords. Highest confidence. */
  if (has(/\b(startup|start-?up|incubator|accelerator|venture\s*(?:fund|capital)|seed\s*(?:fund|round)|pitch\s*competition|entrepreneurs?|founders?|hackathon|innovation\s*challenge)/)) {
    return { category: "startup", cleanedText: text };
  }
  if (has(/\b(phd|ph\.d|doctoral|doctorate|d\.?phil|postdoc(toral)?)/)) {
    return { category: "phd", cleanedText: text };
  }
  if (has(/\b(master'?s|m\.?sc\b|m\.?phil|m\.?a\.?\b|m\.?b\.?a\.?\b|postgrad(uate)?|graduate\s*program)/)) {
    return { category: "masters", cleanedText: text };
  }
  if (has(/\b(bachelor'?s|b\.?sc\b|b\.?a\.?\b|undergrad(uate)?\b|ug\b|high\s*school|secondary\s*school)/)) {
    return { category: "bachelors", cleanedText: text };
  }
  if (has(/\b(faculty|professor|principal\s*investigator|project\s*proposal|research\s*grant|early[-\s]?career\s*researcher|tenure[-\s]?track)/)) {
    return { category: "faculty", cleanedText: text };
  }

  /** Tier 2 — broader keywords with sensible defaults. Looser, lower confidence. */
  if (has(/\b(youth|young\s*(?:leader|professional|innovator)|next\s*generation|teen|undergraduate\s*student|student\s*program|summer\s*school|winter\s*school|internship)/)) {
    return { category: "bachelors", cleanedText: text };
  }
  if (has(/\b(scholarship|study\s*abroad|exchange\s*program|mba|graduate\s*school)/)) {
    return { category: "masters", cleanedText: text };
  }
  if (has(/\b(fellowship|research\s*award|academic\s*award|visiting\s*scholar|sabbatical)/)) {
    return { category: "faculty", cleanedText: text };
  }
  if (has(/\b(grant|call\s*for\s*proposals|call\s*for\s*papers|conference|symposium|colloquium)/)) {
    return { category: "faculty", cleanedText: text };
  }

  return { category: null, cleanedText: text };
}
