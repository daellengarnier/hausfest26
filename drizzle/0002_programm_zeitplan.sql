CREATE TABLE "schedule_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"floor" text DEFAULT '' NOT NULL,
	"titel" text NOT NULL,
	"startMin" integer NOT NULL,
	"endMin" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ressorts" ADD COLUMN "hatZeitplan" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Ressort "Line-up" in "Programm" umbenennen und Zeitplan aktivieren (idempotent).
UPDATE "ressorts" SET "name" = 'Programm', "hatZeitplan" = true WHERE "name" = 'Line-up';
