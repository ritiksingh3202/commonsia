import { prisma } from "@/lib/prisma";
import { whatsappDigitsFromProfile } from "@/lib/zixflow";
import { normalizeInboundWhatsAppDigits } from "@/lib/booking-inbound-whatsapp";
import { classifyForumPostText, type ForumCategorySlug } from "@/lib/forum-categories";
import { isArchitectureRelevant } from "@/lib/forum-arch-filter";

/**
 * Verifies the inbound WhatsApp sender matches the configured community author.
 *
 * Two env vars (both required to enable community auto-publishing):
 *   - COMMUNITY_AUTHOR_USER_ID     — User row that owns the post.
 *   - COMMUNITY_AUTHOR_WHATSAPP_DIGITS — Optional belt-and-braces phone check
 *                                       (e.g. "918445335631"). If unset, falls
 *                                       back to the User's profile whatsappUrl/phone.
 *
 * Returns the author user id if the inbound message is allowed to create a post,
 * otherwise null.
 */
export async function resolveCommunityAuthorForInbound(fromDigits: string): Promise<string | null> {
  const authorUserId = process.env.COMMUNITY_AUTHOR_USER_ID?.trim();
  if (!authorUserId) return null;

  const inboundDigits = normalizeInboundWhatsAppDigits(fromDigits);
  if (!inboundDigits) return null;

  const envDigits = process.env.COMMUNITY_AUTHOR_WHATSAPP_DIGITS?.trim().replace(/\D/g, "") ?? "";
  if (envDigits) {
    if (digitsTailMatches(inboundDigits, envDigits)) return authorUserId;
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: authorUserId },
    select: { whatsappUrl: true, phone: true },
  });
  if (!user) return null;
  const profileDigits = whatsappDigitsFromProfile(user);
  if (!profileDigits) return null;
  if (digitsTailMatches(inboundDigits, profileDigits)) return authorUserId;
  return null;
}

function digitsTailMatches(a: string, b: string): boolean {
  if (a === b) return true;
  const tail = Math.min(a.length, b.length, 10);
  return a.slice(-tail) === b.slice(-tail);
}

/** Strip URLs out of the body text and return them as a separate list. */
export function extractLinks(text: string): { textWithoutLinks: string; links: string[] } {
  const urlRegex = /https?:\/\/[^\s]+/gi;
  const found = new Set<string>();
  for (const m of text.matchAll(urlRegex)) {
    const u = m[0].replace(/[),.;!?]+$/g, "");
    if (u) found.add(u);
  }
  return { textWithoutLinks: text, links: Array.from(found) };
}

type ParsedInboundMedia = { imageUrl: string | null };

/**
 * Pull a usable image URL out of common WhatsApp webhook shapes.
 * Zixflow forwards image messages with a hosted CDN url; Meta sends a media id
 * (id only, not yet supported here — would need a follow-up media fetch + Vercel
 * Blob upload). We accept whatever the payload exposes that already looks like an
 * https URL; otherwise no image.
 */
export function extractInboundMedia(messageNode: unknown): ParsedInboundMedia {
  if (!messageNode || typeof messageNode !== "object") return { imageUrl: null };
  const m = messageNode as Record<string, unknown>;

  const candidates: unknown[] = [
    (m.image as Record<string, unknown> | undefined)?.url,
    (m.image as Record<string, unknown> | undefined)?.link,
    (m.media as Record<string, unknown> | undefined)?.url,
    (m.media as Record<string, unknown> | undefined)?.link,
    m.mediaUrl,
    m.imageUrl,
  ];

  for (const c of candidates) {
    if (typeof c === "string") {
      const u = c.trim();
      if (/^https?:\/\//i.test(u)) return { imageUrl: u };
    }
  }
  return { imageUrl: null };
}

/**
 * Insert a community post if the inbound message hasn't already been processed.
 * Auto-classifies the text into a category (hashtag override > keyword scan, see
 * lib/forum-categories.ts). Returns the new post id (or the existing one if duplicate).
 */
export async function createForumPostFromInbound(opts: {
  authorUserId: string;
  text: string | null;
  imageUrl: string | null;
  whatsappMessageId: string | null;
  /** Override classifier (used by RSS puller, which already knows the category). */
  forcedCategory?: ForumCategorySlug | null;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
}): Promise<string | null> {
  const rawText = opts.text?.trim() || null;
  const imageUrl = opts.imageUrl?.trim() || null;
  if (!rawText && !imageUrl) return null;

  // WhatsApp-origin posts (no forcedCategory) are filtered for architecture relevance.
  // RSS-pulled posts already ran isArchitectureRelevant before reaching here (forcedCategory is set).
  if (opts.forcedCategory === undefined && rawText && !isArchitectureRelevant(rawText, rawText)) {
    console.info("[forum] inbound post skipped — not architecture relevant:", rawText.slice(0, 80));
    return null;
  }

  const { category: detected, cleanedText } = classifyForumPostText(rawText);
  const text = cleanedText ?? rawText;
  const category = opts.forcedCategory !== undefined ? opts.forcedCategory : detected;

  const links = text ? extractLinks(text).links : [];

  if (opts.whatsappMessageId) {
    const existing = await prisma.forumPost.findUnique({
      where: { whatsappMessageId: opts.whatsappMessageId },
      select: { id: true },
    });
    if (existing) return existing.id;
  }

  try {
    const created = await prisma.forumPost.create({
      data: {
        authorUserId: opts.authorUserId,
        text,
        imageUrl,
        links,
        whatsappMessageId: opts.whatsappMessageId ?? null,
        category,
        sourceLabel: opts.sourceLabel ?? null,
        sourceUrl: opts.sourceUrl ?? null,
      },
      select: { id: true },
    });
    return created.id;
  } catch (e) {
    console.error("[forum] create post failed:", e);
    return null;
  }
}
