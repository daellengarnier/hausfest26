CREATE TABLE "shopping_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"subRessortId" integer,
	"titel" text NOT NULL,
	"menge" text DEFAULT '' NOT NULL,
	"erledigt" boolean DEFAULT false NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_subRessortId_sub_ressorts_id_fk" FOREIGN KEY ("subRessortId") REFERENCES "public"."sub_ressorts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Vorjahres-Budget zusammenfassen: statt Einzelposten nur ein Gesamtbetrag je Kostenstelle.
DELETE FROM "budget_items" WHERE "beschreibung" = 'Schätzung (aus Budget 2023)';--> statement-breakpoint
INSERT INTO "budget_items" ("ressortId", "kategorie", "titel", "betragCents", "beschreibung")
SELECT r.id, v.kategorie, 'Richtwert Vorjahr 2023', v.cents, 'Richtwert Vorjahr 2023'
FROM (SELECT id FROM "ressorts" WHERE "hatFinanzen" = true ORDER BY id LIMIT 1) r
CROSS JOIN (VALUES
  ('Essen', 130000),
  ('Getränke', 290000),
  ('Gagen', 270000),
  ('Deko', 50000),
  ('Materialmiete', 55000),
  ('Sonstiges', 40000)
) AS v("kategorie", "cents")
WHERE EXISTS (SELECT 1 FROM "ressorts" WHERE "hatFinanzen" = true)
  AND NOT EXISTS (SELECT 1 FROM "budget_items" WHERE "beschreibung" = 'Richtwert Vorjahr 2023');