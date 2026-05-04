-- AlterTable: add categorization + source attribution columns
ALTER TABLE "ForumPost" ADD COLUMN IF NOT EXISTS "category"     TEXT;
ALTER TABLE "ForumPost" ADD COLUMN IF NOT EXISTS "sourceLabel"  TEXT;
ALTER TABLE "ForumPost" ADD COLUMN IF NOT EXISTS "sourceUrl"    TEXT;

-- CreateIndex: filtered list per category, newest first
CREATE INDEX IF NOT EXISTS "ForumPost_category_deletedAt_postedAt_idx"
  ON "ForumPost" ("category", "deletedAt", "postedAt" DESC);
