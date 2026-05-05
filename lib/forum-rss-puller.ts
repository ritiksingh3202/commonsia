import { classifyForumPostText, type ForumCategorySlug } from "@/lib/forum-categories";
import { detectRegistrationFee } from "@/lib/forum-fee-detector";
import { isArchitectureRelevant } from "@/lib/forum-arch-filter";
import { isRelevantForIndianAudience } from "@/lib/forum-geo-filter";
import { prisma } from "@/lib/prisma";

export type RssSource = {
  /** Stable id used as part of the dedupe key (rss:<id>:<itemGuid>). Never change once shipped. */
  id: string;
  /** Shown on the post card as "From {label}". */
  label: string;
  /** Feed URL — must be public, RSS 2.0 or Atom (we accept both shapes). */
  feedUrl: string;
  /** Optional default category if keyword classification fails for this source. */
  defaultCategory?: ForumCategorySlug | null;
  /**
   * When true, every item from this source is assumed India-relevant and the
   * geo-relevance filter is skipped. Set this for India-specific feeds.
   */
  indiaFocused?: boolean;
  /**
   * When true, every item from this source is assumed architecture-relevant and
   * the architecture filter is skipped. Set this for architecture-specific feeds
   * (Bustler, ArchDaily, Dezeen, Bee Breeders).
   */
  archFocused?: boolean;
  /**
   * "rss" (default) — standard RSS 2.0 / Atom feed.
   * "oai-pmh" — OAI-PMH/Dublin Core format used by DSpace repositories
   *             (Shodhganga, NDLTD, institutional repositories).
   */
  protocol?: "rss" | "oai-pmh";
  /**
   * Max items to pull from feed before filters are applied. Default: 8.
   * OAI-PMH thesis sources need a higher value (50–100) because the arch
   * filter has to scan through many records to find architecture-relevant ones.
   */
  maxFetch?: number;
  /**
   * When true, always assign defaultCategory regardless of the keyword
   * classifier result. Use for thesis/specialised sources where the classifier
   * would otherwise misroute (e.g. a thesis about "sustainable design" would
   * be sent to faculty rather than thesis).
   */
  forceCategory?: boolean;
  /**
   * When true, OAI-PMH items whose dc:language is not English (en / eng) are
   * dropped. Items with no language tag are kept (assumed English).
   * Has no effect on RSS sources (language is rarely declared in RSS feeds).
   */
  englishOnly?: boolean;
};

/**
 * RSS sources for the community feed.
 *
 * India-focused sources (indiaFocused: true) bypass the geo-relevance filter.
 * Global sources are filtered by isRelevantForIndianAudience() before inserting.
 *
 * Removed:
 *   - globalopportunitydesk.com  — too generic, low India signal
 *   - cscuk.fcdo.gov.uk          — UK government scholarships, heavy UK/Commonwealth bias
 *
 * Sites without working RSS (acu.ac.uk, anrfonline.in, icssr.org) are excluded —
 * share those via WhatsApp with a hashtag like #phd / #faculty.
 */
export const FORUM_RSS_SOURCES: RssSource[] = [
  // ── India-focused sources (geo filter skipped) ───────────────────────────

  /**
   * PhDTalks — best indirect proxy for Indian government funding calls:
   * ANRF/SERB (ARG, MATRICS), DST INSPIRE Faculty, ICMR fellowships,
   * PhD positions at IITs/IISc, and research grants up to ₹5 crore.
   */
  {
    id: "phdtalks",
    label: "PhDTalks",
    feedUrl: "https://phdtalks.org/feed/",
    defaultCategory: "phd",
    indiaFocused: true,
  },

  /**
   * The Fellowships.in — aggregates India-specific fellowships:
   * DST INSPIRE, SBI Youth for India, ICGEB, Chief Minister fellowships,
   * and international fellowships open to Indian applicants.
   */
  {
    id: "thefellowships",
    label: "The Fellowships",
    feedUrl: "https://thefellowships.in/feed/",
    defaultCategory: "faculty",
    indiaFocused: true,
  },

  /**
   * LeapScholar Scholarships — scholarships and funding for Indian students
   * studying or planning to study abroad (Masters / undergrad focus).
   */
  {
    id: "leapscholar",
    label: "LeapScholar",
    feedUrl: "https://leapscholar.com/blog/category/scholarships/feed/",
    defaultCategory: "masters",
    indiaFocused: true,
  },

  /**
   * Buddy4Study Study Abroad — study-abroad opportunities and exchange
   * programs specifically curated for Indian students.
   */
  {
    id: "buddy4study",
    label: "Buddy4Study",
    feedUrl: "https://admission.buddy4study.com/study-abroad/feed",
    defaultCategory: "masters",
    indiaFocused: true,
  },

  /**
   * India Education Diary — India-specific education news, scholarships,
   * faculty positions, and research calls.
   */
  {
    id: "indiaeducationdiary",
    label: "India Education Diary",
    feedUrl: "https://indiaeducationdiary.in/feed/",
    defaultCategory: "masters",
    indiaFocused: true,
  },

  /**
   * Internshala Blog — internships, scholarships, and career opportunities
   * aimed squarely at Indian students and fresh graduates.
   */
  {
    id: "internshala",
    label: "Internshala",
    feedUrl: "https://internshala.com/blog/feed/",
    defaultCategory: "bachelors",
    indiaFocused: true,
  },

  /**
   * The Better India — Education — inspiring stories plus real opportunities
   * in Indian education; study-abroad financing, women in STEM, grassroots.
   */
  {
    id: "thebetterindia-edu",
    label: "The Better India",
    feedUrl: "https://www.thebetterindia.com/topics/education/feed/",
    defaultCategory: null,
    indiaFocused: true,
  },

  // ── Architecture competitions (geo filter applied) ────────────────────────

  /**
   * Bustler — the leading aggregator for architecture and design competitions.
   * Covers student and open competitions globally; most are open to all nationalities.
   */
  {
    id: "bustler",
    label: "Bustler",
    feedUrl: "https://bustler.net/feed",
    defaultCategory: "competitions",
    indiaFocused: false,
    archFocused: true,   // 100% architecture competitions — skip arch filter
  },

  /**
   * ArchDaily Competitions — curated international architecture competitions
   * posted alongside editorial coverage; high signal-to-noise ratio.
   */
  {
    id: "archdaily-competitions",
    label: "ArchDaily",
    feedUrl: "https://www.archdaily.com/competitions.rss",
    defaultCategory: "competitions",
    indiaFocused: false,
    archFocused: true,
  },

  /**
   * Dezeen Awards / Competitions — international design and architecture
   * competitions; open entry, covers student and professional categories.
   */
  {
    id: "dezeen-competitions",
    label: "Dezeen",
    feedUrl: "https://www.dezeen.com/competitions/feed/",
    defaultCategory: "competitions",
    indiaFocused: false,
    archFocused: true,
  },

  /**
   * Bee Breeders — dedicated architecture competition organiser;
   * runs multiple open calls per year, many free-to-enter student comps.
   */
  {
    id: "beebreeders",
    label: "Bee Breeders",
    feedUrl: "https://www.bee-breeders.com/feed/",
    defaultCategory: "competitions",
    indiaFocused: false,
    archFocused: true,
  },

  // ── Thesis / Research library sources ────────────────────────────────────
  //
  // NOTE ON DEAD SOURCES (removed 2025-05):
  //   Shodhganga OAI-PMH → 404 (URL changed, new path not yet confirmed)
  //   NDLTD OAI-PMH      → connection refused (server down)
  //   DART-Europe OAI-PMH → connection refused (server down)
  //   IIT Roorkee DSpace  → connection refused (blocked or offline)
  //   CEPT Research RSS   → connection refused (site down)
  // Re-add when endpoints are confirmed working again.

  /**
   * Zenodo — CERN's open research repository, "architecture" community.
   * Covers thesis, conference papers, and research articles in architecture,
   * urban design, and allied fields from global institutions. OAI-PMH returns
   * records tagged with the "user-architecture" Zenodo community.
   *
   * archFocused: true — every record in this community is architecture by definition.
   * forceCategory: true — route all to thesis regardless of keyword classifier.
   */
  {
    id: "zenodo-architecture",
    label: "Zenodo Architecture",
    feedUrl:
      "https://zenodo.org/oai2d?verb=ListRecords&metadataPrefix=oai_dc&set=user-architecture",
    defaultCategory: "thesis",
    indiaFocused: false,
    archFocused: true,    // 100% architecture community — skip arch filter
    protocol: "oai-pmh",
    maxFetch: 20,
    forceCategory: true,
    englishOnly: true,    // drop Persian, Spanish, French etc. records
  },

  /**
   * A+BE Architecture and the Built Environment — TU Delft open-access
   * PhD thesis journal. Every record is a full doctoral thesis in architecture,
   * urbanism, building technology, or landscape architecture. 100% English.
   * Using from=2024 to keep response size under the fetch timeout.
   */
  {
    id: "tudelft-abe",
    label: "TU Delft A+BE",
    feedUrl:
      "https://journals.open.tudelft.nl/abe/oai?verb=ListRecords&metadataPrefix=oai_dc&from=2024-01-01",
    defaultCategory: "thesis",
    indiaFocused: false,
    archFocused: true,    // 100% architecture PhD thesis — skip arch filter
    protocol: "oai-pmh",
    maxFetch: 15,
    forceCategory: true,
    englishOnly: true,
  },

  /**
   * Frontiers in Built Environment — open-access peer-reviewed journal covering
   * urban engineering, structural systems, sustainable design, and housing policy.
   * RSS feed with ~20 recent articles. Architecture-relevant by definition.
   */
  {
    id: "frontiers-built-env",
    label: "Frontiers in Built Environment",
    feedUrl: "https://www.frontiersin.org/journals/built-environment/rss",
    defaultCategory: "thesis",
    indiaFocused: false,
    archFocused: true,    // Built environment journal — skip arch filter
    protocol: "rss",
    maxFetch: 10,
    forceCategory: true,
  },

  // ── Global sources (geo filter applied) ──────────────────────────────────

  /**
   * OpportunityDesk — global youth fellowships, leadership programs, contests.
   * Geo-filtered: only India-open items are inserted.
   */
  {
    id: "opportunitydesk",
    label: "OpportunityDesk",
    feedUrl: "https://opportunitydesk.org/feed/",
    defaultCategory: "bachelors",
    indiaFocused: false,
  },

  /**
   * FundsForNGOs (www2) — research project-proposal calls, ICSSR grants,
   * and India-specific NGO / academic funding opportunities.
   * Geo-filtered: global feed but includes India-specific research calls.
   */
  {
    id: "fundsforngos",
    label: "FundsForNGOs",
    feedUrl: "https://www2.fundsforngos.org/feed/",
    defaultCategory: "faculty",
    indiaFocused: false,
  },
];

type ParsedItem = {
  guid: string;
  title: string;
  link: string;
  description: string;
  imageUrl: string | null;
  pubDate: Date | null;
};

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(Number(d)))
    .replace(/&nbsp;/g, " ");
}

function stripHtml(s: string): string {
  return decodeHtmlEntities(
    s
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function unwrapCdata(s: string): string {
  const m = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(s.trim());
  return m ? m[1] : s;
}

function pickTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = re.exec(block);
  return m ? unwrapCdata(m[1]).trim() : null;
}

function pickImage(block: string): string | null {
  /** WordPress: media:thumbnail / media:content. */
  const media = /<media:(?:thumbnail|content)[^>]*url="([^"]+)"/i.exec(block);
  if (media) return media[1];
  /** Standard enclosure (RSS 2.0). */
  const enclosure = /<enclosure[^>]*url="([^"]+)"[^>]*type="image\/[^"]+"/i.exec(block);
  if (enclosure) return enclosure[1];
  /** First <img src> inside content:encoded / description. */
  const content = pickTag(block, "content:encoded") ?? pickTag(block, "description") ?? "";
  const img = /<img[^>]+src=["']([^"']+)["']/i.exec(content);
  return img ? img[1] : null;
}

/** Language codes considered English for the englishOnly filter. */
const ENGLISH_LANG_CODES = new Set(["en", "eng", "en-us", "en-gb", "english"]);

function isEnglishRecord(block: string): boolean {
  // dc:language may appear multiple times; accept if any value is English.
  // Records with no dc:language tag are assumed English (most repos default to English).
  const langMatches = [...block.matchAll(/<dc:language>([^<]+)<\/dc:language>/gi)];
  if (langMatches.length === 0) return true; // no language declared → keep
  return langMatches.some((m) => ENGLISH_LANG_CODES.has(m[1].trim().toLowerCase()));
}

/**
 * OAI-PMH / Dublin Core parser for DSpace-based repositories
 * (Shodhganga, NDLTD, DART-Europe, institutional repositories).
 *
 * Parses <record> blocks and maps Dublin Core fields to ParsedItem.
 * Skips deleted records and records missing both title and a URL identifier.
 * Pass englishOnly=true to drop non-English records (filters on dc:language).
 */
function parseOaiPmhItems(xml: string, englishOnly = false): ParsedItem[] {
  const items: ParsedItem[] = [];
  const recordRe = /<record\b[\s\S]*?<\/record>/gi;

  for (const m of xml.matchAll(recordRe)) {
    const block = m[0];

    // Skip deleted records
    if (/status\s*=\s*["']deleted["']/i.test(block)) continue;

    // Language filter — drop non-English records when requested
    if (englishOnly && !isEnglishRecord(block)) continue;

    // OAI identifier (used as guid)
    const oaiIdMatch = /<identifier>([^<]+)<\/identifier>/i.exec(block);
    const guid = oaiIdMatch ? oaiIdMatch[1].trim() : null;
    if (!guid) continue;

    // dc:title
    const title = pickTag(block, "dc:title") ?? pickTag(block, "title");
    if (!title) continue;

    // dc:identifier — find the first http URL
    let link: string | null = null;
    for (const im of block.matchAll(/<dc:identifier>([^<]+)<\/dc:identifier>/gi)) {
      const val = im[1].trim();
      if (val.startsWith("http")) { link = val; break; }
    }
    if (!link) continue;

    // Abstract / description
    const abstract =
      pickTag(block, "dc:description") ??
      pickTag(block, "dc:abstract") ??
      "";

    // Author + institution for context
    const creator = pickTag(block, "dc:creator") ?? "";
    const publisher = pickTag(block, "dc:publisher") ?? "";

    // Build a readable description
    const descParts = [
      abstract ? abstract.slice(0, 400).trim() : "",
      creator ? `Author: ${creator}` : "",
      publisher ? `Institution: ${publisher}` : "",
    ].filter(Boolean);
    const description = stripHtml(descParts.join("  ·  "));

    // Date: header datestamp or dc:date (may be just "2022")
    const datestampMatch = /<datestamp>([^<]+)<\/datestamp>/i.exec(block);
    const dateRaw =
      datestampMatch?.[1]?.trim() ??
      pickTag(block, "dc:date") ??
      null;
    let pubDate: Date | null = null;
    if (dateRaw) {
      const d = new Date(dateRaw);
      if (!Number.isNaN(d.getTime())) {
        pubDate = d;
      } else if (/^\d{4}$/.test(dateRaw.trim())) {
        pubDate = new Date(`${dateRaw.trim()}-06-01`);
      }
    }

    items.push({
      guid,
      title: decodeHtmlEntities(title),
      link,
      description,
      imageUrl: null,
      pubDate,
    });
  }
  return items;
}

function parseRssItems(xml: string): ParsedItem[] {
  /** Both <item> (RSS 2.0) and <entry> (Atom) supported. */
  const blocks: string[] = [];
  const itemRe = /<item\b[\s\S]*?<\/item>/gi;
  const entryRe = /<entry\b[\s\S]*?<\/entry>/gi;
  for (const m of xml.matchAll(itemRe)) blocks.push(m[0]);
  if (blocks.length === 0) for (const m of xml.matchAll(entryRe)) blocks.push(m[0]);

  const items: ParsedItem[] = [];
  for (const block of blocks) {
    const title = pickTag(block, "title");
    if (!title) continue;
    /** Atom <link href="..."/> vs RSS <link>...</link>. */
    const linkAtomMatch = /<link[^>]*href="([^"]+)"/i.exec(block);
    const link = linkAtomMatch ? linkAtomMatch[1] : pickTag(block, "link");
    if (!link) continue;
    const guid = pickTag(block, "guid") ?? pickTag(block, "id") ?? link;
    const description =
      pickTag(block, "description") ??
      pickTag(block, "summary") ??
      pickTag(block, "content:encoded") ??
      "";
    const imageUrl = pickImage(block);
    const pubDateStr = pickTag(block, "pubDate") ?? pickTag(block, "published") ?? pickTag(block, "updated");
    const pubDate = pubDateStr ? new Date(pubDateStr) : null;

    items.push({
      guid: decodeHtmlEntities(guid),
      title: decodeHtmlEntities(title),
      link: decodeHtmlEntities(link),
      description: stripHtml(description),
      imageUrl,
      pubDate: pubDate && !Number.isNaN(pubDate.getTime()) ? pubDate : null,
    });
  }
  return items;
}

const MAX_ITEMS_PER_SOURCE = 8;
const FETCH_TIMEOUT_MS = 6000;

async function fetchFeed(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "CommonsiaBot/1.0 (+https://commonsia.com)",
        Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[rss] ${url} returned ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (e) {
    console.warn(`[rss] ${url} fetch failed:`, (e as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function buildPostText(item: ParsedItem, sourceLabel: string): string {
  const blurb = item.description ? item.description.slice(0, 320).trim() : "";
  return [item.title, blurb ? `\n\n${blurb}…` : "", `\n\n— ${sourceLabel}`]
    .join("")
    .trim();
}

export type RssPullSummary = {
  fetched: number;
  newPosts: number;
  skippedByGeoFilter: number;
  skippedByArchFilter: number;
  perSource: Array<{
    id: string;
    fetched: number;
    newPosts: number;
    skippedByGeoFilter: number;
    skippedByArchFilter: number;
    error?: string;
  }>;
};

/** Shape expected by prisma.forumPost.createMany */
type PostCreateInput = {
  authorUserId: string;
  text: string;
  imageUrl: string | null;
  links: string[];
  whatsappMessageId: string;
  category: string | null;
  registrationFee: string | null;
  sourceLabel: string;
  sourceUrl: string;
  postedAt: Date;
};

/**
 * Fetch every configured RSS source, parse new items, dedupe against ForumPost via the
 * `rss:<sourceId>:<guid>` key (stored in `whatsappMessageId` to reuse the existing unique
 * index), and insert. Idempotent: re-running won't duplicate posts.
 *
 * Performance design:
 *  - Phase 1: all feeds fetched in parallel (Promise.all) → total network time = slowest source
 *  - Phase 2: parse + filter in-memory (pure JS, no DB calls)
 *  - Phase 3: ONE createMany call with skipDuplicates:true → single DB round-trip
 *
 * This replaces the old per-item findUnique+create loop (N×M DB calls → 1 DB call).
 */
export async function pullForumRssOnce(authorUserId: string): Promise<RssPullSummary> {
  const summary: RssPullSummary = {
    fetched: 0,
    newPosts: 0,
    skippedByGeoFilter: 0,
    skippedByArchFilter: 0,
    perSource: [],
  };

  // ── Phase 1: fetch all feeds in parallel ──────────────────────────────────
  const fetched = await Promise.all(
    FORUM_RSS_SOURCES.map(async (source) => ({
      source,
      xml: await fetchFeed(source.feedUrl),
    })),
  );

  // ── Phase 2: parse + filter in-memory (zero DB calls) ────────────────────
  const toInsert: PostCreateInput[] = [];

  for (const { source, xml } of fetched) {
    const sourceSummary = {
      id: source.id,
      fetched: 0,
      newPosts: 0,
      skippedByGeoFilter: 0,
      skippedByArchFilter: 0,
    } as RssPullSummary["perSource"][number];
    summary.perSource.push(sourceSummary);

    if (!xml) {
      sourceSummary.error = "fetch_failed";
      continue;
    }

    const maxFetch = source.maxFetch ?? MAX_ITEMS_PER_SOURCE;
    const items =
      source.protocol === "oai-pmh"
        ? parseOaiPmhItems(xml, source.englishOnly ?? false).slice(0, maxFetch)
        : parseRssItems(xml).slice(0, maxFetch);

    sourceSummary.fetched = items.length;
    summary.fetched += items.length;

    for (const item of items) {
      // Architecture-relevance gate (cheapest first).
      // archFocused sources (Bustler, ArchDaily, Dezeen, Bee Breeders) bypass entirely.
      if (!source.archFocused && !isArchitectureRelevant(item.title, item.description)) {
        sourceSummary.skippedByArchFilter += 1;
        summary.skippedByArchFilter += 1;
        continue;
      }

      // Geo-relevance gate — skip items not open to Indian users.
      // indiaFocused sources bypass this check entirely.
      if (!source.indiaFocused && !isRelevantForIndianAudience(item.title, item.description)) {
        sourceSummary.skippedByGeoFilter += 1;
        summary.skippedByGeoFilter += 1;
        continue;
      }

      const dedupeKey = `rss:${source.id}:${item.guid}`;
      const text = buildPostText(item, source.label);
      const { category } = classifyForumPostText(`${item.title}\n${item.description}`);
      // forceCategory: always use source default (thesis sources must not be
      // rerouted to phd/faculty by the keyword classifier).
      const finalCategory = source.forceCategory
        ? (source.defaultCategory ?? null)
        : (category ?? source.defaultCategory ?? null);
      const registrationFee =
        finalCategory === "competitions"
          ? detectRegistrationFee(item.title, item.description)
          : null;

      toInsert.push({
        authorUserId,
        text,
        imageUrl: item.imageUrl,
        links: [item.link],
        whatsappMessageId: dedupeKey,
        category: finalCategory,
        registrationFee,
        sourceLabel: source.label,
        sourceUrl: item.link,
        postedAt: item.pubDate ?? new Date(),
      });

      // Optimistically count per-source; skipDuplicates may reduce the actual total.
      sourceSummary.newPosts += 1;
    }
  }

  // ── Phase 3: single batch insert, duplicates silently skipped ────────────
  if (toInsert.length > 0) {
    try {
      const result = await prisma.forumPost.createMany({
        data: toInsert,
        skipDuplicates: true,
      });
      summary.newPosts = result.count;

      // Back-fill per-source newPosts to reflect actual inserts (approximate —
      // we don't know which specific rows were skipped, so keep the optimistic
      // per-source counts; the top-level summary.newPosts is authoritative).
    } catch (e) {
      console.error("[rss] createMany failed:", e);
    }
  }

  return summary;
}
