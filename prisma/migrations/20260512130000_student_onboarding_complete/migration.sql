-- Add studentOnboardingComplete column to User table.
-- Backfill: anyone with role='student' and profileComplete=true is already done.

ALTER TABLE public."User"
  ADD COLUMN "studentOnboardingComplete" BOOLEAN NOT NULL DEFAULT false;

UPDATE public."User"
  SET "studentOnboardingComplete" = true
  WHERE role = 'student' AND "profileComplete" = true;
