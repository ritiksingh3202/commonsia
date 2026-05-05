export const FORUM_CATEGORIES = [
  {
    slug: "competitions",
    label: "Competitions",
    accent: "#0891b2",
    description: "Architecture and design competitions worldwide, tagged free or paid entry.",
  },
  {
    slug: "bachelors",
    label: "Bachelors",
    accent: "#2563eb",
    description: "Undergraduate scholarships, exchange programs, and internship opportunities.",
  },
  {
    slug: "masters",
    label: "Masters",
    accent: "#16a34a",
    description: "Postgraduate programs, study-abroad fellowships, and funded Masters seats.",
  },
  {
    slug: "phd",
    label: "PhD",
    accent: "#7c3aed",
    description: "Doctoral positions, research grants, and SERB / ANRF / ICMR funding calls.",
  },
  {
    slug: "faculty",
    label: "Faculty & Grants",
    accent: "#ea580c",
    description: "Faculty positions, project proposals, and institutional research funding.",
  },
  {
    slug: "startup",
    label: "Startup Calls",
    accent: "#db2777",
    description: "Incubators, accelerators, seed funding, and innovation challenges.",
  },
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
  competition: "competitions",
  competitions: "competitions",
  opencompetition: "competitions",
  bachelor: "bachelors",
  bachelors: "bachelors",
  undergrad: "bachelors",
  undergraduate: "bachelors",
  ug: "bachelors",
  exchange: "bachelors",
  internship: "bachelors",
  master: "masters",
  masters: "masters",
  pg: "masters",
  postgrad: "masters",
  postgraduate: "masters",
  studyabroad: "masters",
  fellowship: "masters",
  phd: "phd",
  doctorate: "phd",
  doctoral: "phd",
  faculty: "faculty",
  proposal: "faculty",
  proposals: "faculty",
  research: "faculty",
  grant: "faculty",
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
  if (has(/\b(architecture\s*competition|design\s*competition|ideas?\s*competition|student\s*competition|open\s*competition|competition\s*brief|call\s*for\s*(entries|submissions|ideas)|open\s*call\b|design\s*challenge|architecture\s*award|design\s*award|prize\s*competition)/)) {
    return { category: "competitions", cleanedText: text };
  }
  if (has(/\b(startup|start-?up|incubator|accelerator|venture\s*(?:fund|capital)|seed\s*(?:fund|round)|pitch\s*competition|entrepreneurs?|founders?|hackathon|innovation\s*challenge)/)) {
    return { category: "startup", cleanedText: text };
  }
  if (has(/\b(phd|ph\.d\.?|doctoral|doctorate|d\.?phil|postdoc(toral)?|ph\.?\s*d\s*fellowship|doctoral\s*fellowship)/)) {
    return { category: "phd", cleanedText: text };
  }
  if (has(/\b(master'?s|m\.?sc\b|m\.?phil|m\.?a\.?\b|m\.?b\.?a\.?\b|postgrad(uate)?|graduate\s*program)/)) {
    return { category: "masters", cleanedText: text };
  }
  if (has(/\b(bachelor'?s|b\.?sc\b|b\.?a\.?\b|undergrad(uate)?\b|ug\b|high\s*school|secondary\s*school)/)) {
    return { category: "bachelors", cleanedText: text };
  }
  if (has(/\b(faculty|professor|principal\s*investigator|project\s*proposal|research\s*grant|research\s*proposal|early[-\s]?career\s*researcher|tenure[-\s]?track|call\s*for\s*(?:proposals|applications\s*from\s*(?:researchers?|faculty|scholars?|investigators?))|funding\s*(?:call|opportunity|scheme)|serb|anrf|csir\b|icmr\b|dbt\b|icar\b)/)) {
    return { category: "faculty", cleanedText: text };
  }

  /** Tier 2 — broader keywords with sensible defaults. Looser, lower confidence. */
  // Youth/school-level exchange and internship programs → bachelors
  if (has(/\b(youth\s*exchange|student\s*exchange|school\s*exchange|high\s*school\s*exchange|cultural\s*exchange|afs\b|rotary\s*exchange)/)) {
    return { category: "bachelors", cleanedText: text };
  }
  if (has(/\b(youth|young\s*(?:leader|professional|innovator)|next\s*generation|teen|undergraduate\s*student|student\s*program|summer\s*school|winter\s*school|internship)/)) {
    return { category: "bachelors", cleanedText: text };
  }
  // Graduate-level exchange and study-abroad programs → masters
  if (has(/\b(scholarship|study\s*abroad|exchange\s*program|academic\s*exchange|research\s*exchange|mba|graduate\s*school|fulbright|erasmus|daad|chevening|commonwealth\s*scholarship|dst\s*inspire)/)) {
    return { category: "masters", cleanedText: text };
  }
  // Research fellowships and visiting positions (no level indicator) → faculty
  if (has(/\b(fellowship|research\s*award|academic\s*award|visiting\s*scholar|sabbatical|postdoctoral\s*(?:position|opportunity))/)) {
    return { category: "faculty", cleanedText: text };
  }
  if (has(/\b(grant|call\s*for\s*proposals|call\s*for\s*papers|conference|symposium|colloquium)/)) {
    return { category: "faculty", cleanedText: text };
  }

  return { category: null, cleanedText: text };
}
