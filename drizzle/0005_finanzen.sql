CREATE TABLE "attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"mime" text DEFAULT 'application/octet-stream' NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"dataB64" text NOT NULL,
	"uploadedBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"userId" integer,
	"betragCents" integer NOT NULL,
	"waehrung" text DEFAULT 'CHF' NOT NULL,
	"kategorie" text DEFAULT 'Sonstiges' NOT NULL,
	"beschreibung" text DEFAULT '' NOT NULL,
	"datum" text,
	"belegId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ressorts" ADD COLUMN "hatFinanzen" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedBy_users_id_fk" FOREIGN KEY ("uploadedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_belegId_attachments_id_fk" FOREIGN KEY ("belegId") REFERENCES "public"."attachments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Finanzen-Ressort für die Ausgabenverwaltung markieren.
UPDATE "ressorts" SET "hatFinanzen" = true WHERE "name" = 'Finanzen';
