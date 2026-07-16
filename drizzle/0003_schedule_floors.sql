CREATE TABLE "schedule_floors" (
	"id" serial PRIMARY KEY NOT NULL,
	"ressortId" integer NOT NULL,
	"name" text NOT NULL,
	"farbe" text DEFAULT '#6366f1' NOT NULL,
	"reihenfolge" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schedule_floors" ADD CONSTRAINT "schedule_floors_ressortId_ressorts_id_fk" FOREIGN KEY ("ressortId") REFERENCES "public"."ressorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_floor_ressort_name" ON "schedule_floors" USING btree ("ressortId","name");--> statement-breakpoint
-- Vordefinierte Floors für das Programm-Ressort (idempotent).
INSERT INTO "schedule_floors" ("ressortId", "name", "farbe", "reihenfolge")
SELECT r.id, v.name, v.farbe, v.ord
FROM "ressorts" r
CROSS JOIN (VALUES
  ('Club', '#6366f1', 1),
  ('Ambient (EG Nord)', '#06b6d4', 2),
  ('Alternativfloor (Family-WG)', '#f43f5e', 3),
  ('Garten', '#22c55e', 4)
) AS v(name, farbe, ord)
WHERE r."hatZeitplan" = true
ON CONFLICT ("ressortId", "name") DO NOTHING;
