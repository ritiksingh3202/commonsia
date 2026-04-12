-- Link session reviews to the mentor they concern (public profile + analytics).
ALTER TABLE "SessionReview" ADD COLUMN "mentorId" TEXT;

CREATE INDEX "SessionReview_mentorId_idx" ON "SessionReview"("mentorId");

ALTER TABLE "SessionReview" ADD CONSTRAINT "SessionReview_mentorId_fkey"
  FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
