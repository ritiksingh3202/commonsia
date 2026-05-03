-- CreateTable
CREATE TABLE "ForumPost" (
    "id" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "text" TEXT,
    "imageUrl" TEXT,
    "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whatsappMessageId" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ForumPost_whatsappMessageId_key" ON "ForumPost"("whatsappMessageId");

-- CreateIndex
CREATE INDEX "ForumPost_deletedAt_postedAt_idx" ON "ForumPost"("deletedAt", "postedAt" DESC);

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
