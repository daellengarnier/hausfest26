CREATE TABLE "act_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"actId" integer NOT NULL,
	"attachmentId" integer NOT NULL,
	"rubrik" text DEFAULT 'sonstiges' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"typ" text DEFAULT 'band' NOT NULL,
	"kostenCents" integer,
	"uebernachtung" boolean DEFAULT false NOT NULL,
	"anzahlPersonen" integer,
	"promotext" text DEFAULT '' NOT NULL,
	"notiz" text DEFAULT '' NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_items" ADD COLUMN "actId" integer;--> statement-breakpoint
ALTER TABLE "ressorts" ADD COLUMN "hatActs" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD COLUMN "actId" integer;--> statement-breakpoint
ALTER TABLE "act_files" ADD CONSTRAINT "act_files_actId_acts_id_fk" FOREIGN KEY ("actId") REFERENCES "public"."acts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "act_files" ADD CONSTRAINT "act_files_attachmentId_attachments_id_fk" FOREIGN KEY ("attachmentId") REFERENCES "public"."attachments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acts" ADD CONSTRAINT "acts_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acts" ADD CONSTRAINT "acts_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_actId_acts_id_fk" FOREIGN KEY ("actId") REFERENCES "public"."acts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_actId_acts_id_fk" FOREIGN KEY ("actId") REFERENCES "public"."acts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Acts-Ressort in bereits geseedete (Prod-)DBs einfügen (direkt nach Programm).
-- Auf frischer DB existiert 'Programm' hier noch nicht → No-op; der Seed legt Acts an.
UPDATE "ressorts" SET "reihenfolge" = "reihenfolge" + 1
  WHERE "reihenfolge" >= 2 AND EXISTS (SELECT 1 FROM "ressorts" WHERE "name" = 'Programm');--> statement-breakpoint
INSERT INTO "ressorts" ("name", "beschreibung", "farbe", "reihenfolge", "hatZeitplan", "hatFinanzen", "hatActs")
  SELECT 'Acts', '', '#d6409f', 2, false, false, true
  WHERE EXISTS (SELECT 1 FROM "ressorts" WHERE "name" = 'Programm')
    AND NOT EXISTS (SELECT 1 FROM "ressorts" WHERE "name" = 'Acts');--> statement-breakpoint
-- Programm-Ressort umbenennen (nach dem Acts-Insert, damit obige EXISTS-Checks greifen).
UPDATE "ressorts" SET "name" = 'Programmübersicht' WHERE "name" = 'Programm';