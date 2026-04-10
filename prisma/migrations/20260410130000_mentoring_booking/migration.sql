-- CreateTable
CREATE TABLE "MentoringBooking" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "googleEventId" TEXT,

    CONSTRAINT "MentoringBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MentoringBooking_studentId_startAt_idx" ON "MentoringBooking"("studentId", "startAt");

-- CreateIndex
CREATE INDEX "MentoringBooking_mentorId_idx" ON "MentoringBooking"("mentorId");

-- AddForeignKey
ALTER TABLE "MentoringBooking" ADD CONSTRAINT "MentoringBooking_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentoringBooking" ADD CONSTRAINT "MentoringBooking_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
