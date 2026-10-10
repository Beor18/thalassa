CREATE TABLE "ambrosia_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_nonces" (
	"nonce" text PRIMARY KEY NOT NULL,
	"wallet" text NOT NULL,
	"message" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"island_id" integer NOT NULL,
	"slot" integer NOT NULL,
	"name" text NOT NULL,
	"is_capital" boolean DEFAULT false NOT NULL,
	"wood" double precision NOT NULL,
	"wine" double precision NOT NULL,
	"marble" double precision NOT NULL,
	"crystal" double precision NOT NULL,
	"sulfur" double precision NOT NULL,
	"population" double precision NOT NULL,
	"wood_workers" integer DEFAULT 0 NOT NULL,
	"lux_workers" integer DEFAULT 0 NOT NULL,
	"scientists" integer DEFAULT 0 NOT NULL,
	"wine_level" integer DEFAULT 0 NOT NULL,
	"ships" integer DEFAULT 0 NOT NULL,
	"buildings" jsonb NOT NULL,
	"units" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"construction" jsonb,
	"training" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "islands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"resource" text NOT NULL,
	"variant" integer DEFAULT 0 NOT NULL,
	"sawmill_level" integer DEFAULT 1 NOT NULL,
	"sawmill_donated" double precision DEFAULT 0 NOT NULL,
	"mine_level" integer DEFAULT 1 NOT NULL,
	"mine_donated" double precision DEFAULT 0 NOT NULL,
	"barbarian_level" integer DEFAULT 1 NOT NULL,
	"barbarian_defeated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"origin_city_id" uuid NOT NULL,
	"target_city_id" uuid,
	"target_island_id" integer NOT NULL,
	"target_slot" integer,
	"colony_name" text,
	"ships" integer NOT NULL,
	"units" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cargo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"departs_at" timestamp with time zone NOT NULL,
	"arrives_at" timestamp with time zone NOT NULL,
	"returns_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet" text NOT NULL,
	"name" text NOT NULL,
	"gold" double precision NOT NULL,
	"research" double precision DEFAULT 0 NOT NULL,
	"ambrosia" integer DEFAULT 0 NOT NULL,
	"ambrosia_synced" bigint DEFAULT 0 NOT NULL,
	"techs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_tick" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_wallet_unique" UNIQUE("wallet")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" jsonb NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ambrosia_ledger" ADD CONSTRAINT "ambrosia_ledger_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_island_id_islands_id_fk" FOREIGN KEY ("island_id") REFERENCES "public"."islands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_origin_city_id_cities_id_fk" FOREIGN KEY ("origin_city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_target_city_id_cities_id_fk" FOREIGN KEY ("target_city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_target_island_id_islands_id_fk" FOREIGN KEY ("target_island_id") REFERENCES "public"."islands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ambrosia_ledger_player" ON "ambrosia_ledger" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cities_island_slot" ON "cities" USING btree ("island_id","slot");--> statement-breakpoint
CREATE INDEX "cities_player" ON "cities" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "islands_xy" ON "islands" USING btree ("x","y");--> statement-breakpoint
CREATE INDEX "missions_due_out" ON "missions" USING btree ("status","arrives_at");--> statement-breakpoint
CREATE INDEX "missions_due_back" ON "missions" USING btree ("status","returns_at");--> statement-breakpoint
CREATE INDEX "missions_player" ON "missions" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "reports_player_created" ON "reports" USING btree ("player_id","created_at");