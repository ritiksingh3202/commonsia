-- One-time: copy legacy student phone into whatsappUrl when WhatsApp is empty.
-- Safe to run multiple times (only fills NULL/blank whatsappUrl).

UPDATE "User"
SET "whatsappUrl" = TRIM("phone")
WHERE "role" = 'student'
  AND "phone" IS NOT NULL
  AND TRIM("phone") <> ''
  AND ("whatsappUrl" IS NULL OR TRIM("whatsappUrl") = '');
