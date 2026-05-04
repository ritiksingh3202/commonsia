-- CreateIndex
-- Speeds up "find by role" (mentor directory, inbound WhatsApp matcher, dashboard checks).
CREATE INDEX IF NOT EXISTS "User_role_mentorOnboardingComplete_accountDeletedAt_idx"
  ON "User" ("role", "mentorOnboardingComplete", "accountDeletedAt");
