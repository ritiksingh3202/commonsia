-- Ephemeral signing material for WhatsApp quick-reply Accept (backs up Upstash Redis).
ALTER TABLE "BookingRequest" ADD COLUMN "actionRawTokenOpaque" TEXT;
