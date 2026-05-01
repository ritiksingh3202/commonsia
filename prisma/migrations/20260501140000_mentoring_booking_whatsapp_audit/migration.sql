-- AlterTable
ALTER TABLE "MentoringBooking" ADD COLUMN "bookingRequestId" TEXT,
ADD COLUMN "whatsappStudentNotifiedAt" TIMESTAMP(3),
ADD COLUMN "whatsappMentorNotifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "MentoringBooking_bookingRequestId_key" ON "MentoringBooking"("bookingRequestId");

-- AddForeignKey
ALTER TABLE "MentoringBooking" ADD CONSTRAINT "MentoringBooking_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "BookingRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
