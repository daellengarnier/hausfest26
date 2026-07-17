CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_budgets" (
	"kategorie" text PRIMARY KEY NOT NULL,
	"betragCents" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "actId" integer;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_actId_acts_id_fk" FOREIGN KEY ("actId") REFERENCES "public"."acts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Budget je Kostenstelle mit den bisherigen Summen der Budgetposten vorbelegen
-- (die aktuell angezeigten „/ Betrag"-Werte inkl. Vorjahr & Acts).
INSERT INTO "category_budgets" ("kategorie", "betragCents")
SELECT "kategorie", SUM("betragCents")::int FROM "budget_items" GROUP BY "kategorie"
ON CONFLICT ("kategorie") DO NOTHING;--> statement-breakpoint
-- Bestehende Act-Gagen von Budgetposten zu Ausgaben (Ist) migrieren.
INSERT INTO "expenses" ("ressortId", "userId", "betragCents", "waehrung", "kategorie", "beschreibung", "actId")
SELECT b."ressortId", NULL, b."betragCents", 'CHF', 'Gagen', b."titel", b."actId"
FROM "budget_items" b
WHERE b."actId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "expenses" e WHERE e."actId" = b."actId");--> statement-breakpoint
-- Einzel-Budgetposten (inkl. Vorjahr) entfernen – Budget läuft nur noch über category_budgets.
DELETE FROM "budget_items";