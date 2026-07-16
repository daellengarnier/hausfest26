CREATE TABLE "schedule_markers" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"board" text DEFAULT 'programm' NOT NULL,
	"titel" text DEFAULT '' NOT NULL,
	"startMin" integer NOT NULL,
	"endMin" integer NOT NULL,
	"farbe" text DEFAULT '#f59e0b' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "uq_floor_ressort_name";--> statement-breakpoint
ALTER TABLE "schedule_entries" ALTER COLUMN "titel" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD COLUMN "board" text DEFAULT 'programm' NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_floors" ADD COLUMN "board" text DEFAULT 'programm' NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_markers" ADD CONSTRAINT "schedule_markers_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_floor_ressort_board_name" ON "schedule_floors" USING btree ("ressortId","board","name");--> statement-breakpoint
-- Vordefinierte Bars (Board 'bars') fürs Programm-Ressort.
INSERT INTO "schedule_floors" ("ressortId", "board", "name", "farbe", "reihenfolge")
SELECT r.id, 'bars', v.name, v.farbe, v.ord
FROM "ressorts" r
CROSS JOIN (VALUES
  ('Bar im Garten', '#22c55e', 1),
  ('Bar im Ostblock', '#f97316', 2)
) AS v(name, farbe, ord)
WHERE r."hatZeitplan" = true
ON CONFLICT ("ressortId", "board", "name") DO NOTHING;
--> statement-breakpoint
-- Öffnungszeiten der vordefinierten Bars.
INSERT INTO "schedule_entries" ("ressortId", "board", "floor", "titel", "startMin", "endMin")
SELECT r.id, 'bars', v.floor, v.titel, v.s, v.e
FROM "ressorts" r
CROSS JOIN (VALUES
  ('Bar im Garten', '', 0, 360),
  ('Bar im Ostblock', 'Snacks', 330, 960)
) AS v(floor, titel, s, e)
WHERE r."hatZeitplan" = true;
--> statement-breakpoint
-- Nachtessen als dezentes Zeitfenster (18:00–20:00) im Programm-Board.
INSERT INTO "schedule_markers" ("ressortId", "board", "titel", "startMin", "endMin", "farbe")
SELECT r.id, 'programm', 'Nachtessen', 120, 240, '#f59e0b'
FROM "ressorts" r
WHERE r."hatZeitplan" = true;
