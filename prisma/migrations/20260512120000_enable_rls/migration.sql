-- Enable Row-Level Security on every public table.
--
-- The app connects via the postgres/service role (DATABASE_URL / DIRECT_URL),
-- which bypasses RLS by design — so this has zero effect on Prisma queries.
-- It only closes off the unauthenticated Supabase Data API (PostgREST /rest/v1/)
-- which would otherwise expose all rows to anyone with the anon key.
--
-- No policies are added because the app never uses the Data API; blocking all
-- anonymous access is the correct posture here.

ALTER TABLE public."User"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Account"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Session"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MentoringBooking"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BookingRequest"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ChatThread"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ChatMessage"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SessionReview"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ForumPost"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ForumReply"        ENABLE ROW LEVEL SECURITY;
