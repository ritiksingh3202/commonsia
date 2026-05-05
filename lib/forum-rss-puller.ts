import { classifyForumPostText, type ForumCategorySlug } from "@/lib/forum-categories";
import { detectRegistrationFee } from "@/lib/forum-fee-detector";
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
const FETCH_TIMEOUT_MS = 8000;

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
  perSource: Array<{ id: string; fetched: number; newPosts: number; skippedByGeoFilter: number; error?: string }>;
};

/**
 * Fetch every configured RSS source, parse new items, dedupe against ForumPost via the
 * `rss:<sourceId>:<guid>` key (stored in `whatsappMessageId` to reuse the existing unique
 * index), and insert. Idempotent: re-running won't duplicate posts.
 */
export async function pullForumRssOnce(authorUserId: string): Promise<RssPullSummary> {
  const summary: RssPullSummary = { fetched: 0, newPosts: 0, skippedByGeoFilter: 0, perSource: [] };

  for (const source of FORUM_RSS_SOURCES) {
    const sourceSummary = { id: source.id, fetched: 0, newPosts: 0, skippedByGeoFilter: 0 } as RssPullSummary["perSource"][number];
    summary.perSource.push(sourceSummary);

    const xml = await fetchFeed(source.feedUrl);
    if (!xml) {
      sourceSummary.error = "fetch_failed";
      continue;
    }
    const items = parseRssItems(xml).slice(0, MAX_ITEMS_PER_SOURCE);
    sourceSummary.fetched = items.length;
    summary.fetched += items.length;

    for (const item of items) {
      // Geo-relevance gate — skip items that are clearly not open to Indian users.
      // India-focused sources (indiaFocused: true) bypass this check entirely.
      if (!source.indiaFocused && !isRelevantForIndianAudience(item.title, item.description)) {
        console.log(`[rss] skipped (not India-relevant): "${item.title.slice(0, 60)}"`);
        sourceSummary.skippedByGeoFilter += 1;
        summary.skippedByGeoFilter += 1;
        continue;
      }

      const dedupeKey = `rss:${source.id}:${item.guid}`;
      const existing = await prisma.forumPost.findUnique({
        where: { whatsappMessageId: dedupeKey },
        select: { id: true },
      });
      if (existing) continue;

      const text = buildPostText(item, source.label);
      const { category } = classifyForumPostText(`${item.title}\n${item.description}`);
      const finalCategory = category ?? source.defaultCategory ?? null;
      const registrationFee =
        finalCategory === "competitions"
          ? detectRegistrationFee(item.title, item.description)
          : null;

      try {
        await prisma.forumPost.create({
          data: {
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
          },
        });
        sourceSummary.newPosts += 1;
        summary.newPosts += 1;
      } catch (e) {
        console.error(`[rss] insert failed for ${dedupeKey}:`, e);
      }
    }
  }
  return summary;
}
