-- Run in Supabase → SQL Editor (public schema).
-- Expect one row per table name; "User" should list ~40 columns if migrations + baseline match Prisma.

SELECT table_name, COUNT(*)::int AS column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'User',
    'Account',
    'Session',
    'VerificationToken',
    'MentoringBooking',
    'ChatThread',
    'ChatMessage',
    'SessionReview'
  )
GROUP BY table_name
ORDER BY table_name;

-- If "User" is missing or column_count is far below Prisma’s User model, apply schema:
--   From repo root with DATABASE_URL set:  npx prisma db push
--   Or:  npx prisma migrate deploy   (only if migrations + history match your DB; see .env.example)
