-- CreateTable
CREATE TABLE "SessionReview" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "comment" TEXT,

    CONSTRAINT "SessionReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionReview_studentId_idx" ON "SessionReview"("studentId");

-- CreateIndex
CREATE INDEX "SessionReview_createdAt_idx" ON "SessionReview"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "SessionReview" ADD CONSTRAINT "SessionReview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
