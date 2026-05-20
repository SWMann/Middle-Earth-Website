CREATE SCHEMA "web";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web"."accounts" (
	"discord_id" text PRIMARY KEY NOT NULL,
	"discord_username" text NOT NULL,
	"discord_avatar" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web"."mc_links" (
	"mc_uuid" uuid PRIMARY KEY NOT NULL,
	"discord_id" text NOT NULL,
	"mc_username" text NOT NULL,
	"linked_at" timestamp with time zone NOT NULL,
	"unlinked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web"."notification_state" (
	"discord_id" text NOT NULL,
	"event_id" text NOT NULL,
	"read_at" timestamp with time zone,
	CONSTRAINT "notification_state_discord_id_event_id_pk" PRIMARY KEY("discord_id","event_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web"."sessions" (
	"session_id" text PRIMARY KEY NOT NULL,
	"discord_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "web"."wiki_pages" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	"published" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web"."mc_links" ADD CONSTRAINT "mc_links_discord_id_accounts_discord_id_fk" FOREIGN KEY ("discord_id") REFERENCES "web"."accounts"("discord_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web"."notification_state" ADD CONSTRAINT "notification_state_discord_id_accounts_discord_id_fk" FOREIGN KEY ("discord_id") REFERENCES "web"."accounts"("discord_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web"."sessions" ADD CONSTRAINT "sessions_discord_id_accounts_discord_id_fk" FOREIGN KEY ("discord_id") REFERENCES "web"."accounts"("discord_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "web"."wiki_pages" ADD CONSTRAINT "wiki_pages_updated_by_accounts_discord_id_fk" FOREIGN KEY ("updated_by") REFERENCES "web"."accounts"("discord_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
