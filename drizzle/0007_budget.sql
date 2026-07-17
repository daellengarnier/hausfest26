CREATE TABLE "budget_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"kategorie" text DEFAULT 'Sonstiges' NOT NULL,
	"titel" text DEFAULT '' NOT NULL,
	"betragCents" integer NOT NULL,
	"beschreibung" text DEFAULT '' NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;