ALTER TABLE "users" ADD COLUMN "avatarAttachmentId" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "claimed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Vorbelegte Profile (Platzhalter): können Todos/Leads zugewiesen bekommen und
-- werden bei der Registrierung per Namensauswahl übernommen (claimed=true).
-- Nur anlegen, wenn Name/E-Mail noch nicht existieren.
INSERT INTO "users" ("name", "email", "passwordHash", "rolle", "avatarColor", "mustChangePassword", "active", "claimed")
SELECT v.name, v.email, '', 'mitglied', v.farbe, false, true, false
FROM (VALUES
  ('Reto', 'reto@platzhalter.local', '#f97316'),
  ('Lucien', 'lucien@platzhalter.local', '#06b6d4'),
  ('Ambar', 'ambar@platzhalter.local', '#8b5cf6'),
  ('Bäscht', 'baescht@platzhalter.local', '#22c55e'),
  ('Dällen', 'daellen@platzhalter.local', '#ec4899'),
  ('Nando', 'nando@platzhalter.local', '#3b82f6')
) AS v(name, email, farbe)
WHERE NOT EXISTS (SELECT 1 FROM "users" u WHERE u."name" = v.name)
  AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u."email" = v.email);