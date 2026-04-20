-- Soft-delete: keep User row for FKs/history; hide from listings and sign-in via `accountDeletedAt`.
ALTER TABLE "User" ADD COLUMN "accountDeletedAt" TIMESTAMP(3);
