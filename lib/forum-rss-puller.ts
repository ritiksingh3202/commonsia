import { classifyForumPostText, type ForumCategorySlug } from "@/lib/forum-categories";
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
    feedUrl: "https://blog.internshala.com/feed/",
    defaultCategory: "bachelors",
    indiaFocused: true,
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

      try {
        await prisma.forumPost.create({
          data: {
            authorUserId,
            text,
            imageUrl: item.imageUrl,
            links: [item.link],
            whatsappMessageId: dedupeKey,
            category: finalCategory,
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
