-- Row Level Security on every game table, with no policies: hosted Postgres (Supabase) exposes the
-- public schema through its REST API, and this keeps the anon/authenticated roles out. The game
-- server connects as the tables' owner, which bypasses RLS, so nothing changes for the game.
ALTER TABLE "ambrosia_ledger" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "analytics_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth_nonces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "islands" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "missions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "players" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "referrals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
