import { classifyForumPostText, type ForumCategorySlug } from "@/lib/forum-categories";
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
};

/**
 * Verified during build:
 *   opportunitydesk.org/feed/        -> 200 application/rss+xml
 *   globalopportunitydesk.com/feed/  -> 200
 *   cscuk.fcdo.gov.uk/feed/          -> 200 application/rss+xml
 *
 * Sites without a working RSS feed (acu.ac.uk blocks scrapers; anrfonline.in /
 * icssr.org return 404 on /feed/) are excluded — feed those via WhatsApp forwarding
 * to the Commonsia number with a hashtag like #phd / #faculty.
 */
export const FORUM_RSS_SOURCES: RssSource[] = [
  { id: "opportunitydesk", label: "OpportunityDesk", feedUrl: "https://opportunitydesk.org/feed/" },
  { id: "globalopportunitydesk", label: "Global Opportunity Desk", feedUrl: "https://globalopportunitydesk.com/feed/" },
  { id: "cscuk", label: "Commonwealth Scholarships", feedUrl: "https://cscuk.fcdo.gov.uk/feed/", defaultCategory: "phd" },
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
  perSource: Array<{ id: string; fetched: number; newPosts: number; error?: string }>;
};

/**
 * Fetch every configured RSS source, parse new items, dedupe against ForumPost via the
 * `rss:<sourceId>:<guid>` key (stored in `whatsappMessageId` to reuse the existing unique
 * index), and insert. Idempotent: re-running won't duplicate posts.
 */
export async function pullForumRssOnce(authorUserId: string): Promise<RssPullSummary> {
  const summary: RssPullSummary = { fetched: 0, newPosts: 0, perSource: [] };

  for (const source of FORUM_RSS_SOURCES) {
    const sourceSummary = { id: source.id, fetched: 0, newPosts: 0 } as RssPullSummary["perSource"][number];
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
