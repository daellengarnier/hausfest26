-- Start-Budget für 2026, abgeleitet aus dem Hausfest-Budget 2023.
-- Wird als Budgetposten (Plan) im Finanzen-Ressort angelegt, mit den aktuellen
-- Kostenstellen (Essen, Getränke, Gagen, Deko, Materialmiete, Sonstiges).
-- Läuft nur, wenn ein Finanzen-Ressort existiert (Prod) und noch nicht geseedet.
INSERT INTO "budget_items" ("ressortId", "kategorie", "titel", "betragCents", "beschreibung")
SELECT r.id, v.kategorie, v.titel, v.cents, 'Schätzung (aus Budget 2023)'
FROM (SELECT id FROM "ressorts" WHERE "hatFinanzen" = true ORDER BY id LIMIT 1) r
CROSS JOIN (VALUES
  ('Essen', 'Abendessen (ca. 120 P)', 120000),
  ('Essen', 'Dessert', 10000),
  ('Getränke', 'Bier (Bierexpress)', 250000),
  ('Getränke', 'Prosecco / Anker (Coop)', 20000),
  ('Getränke', 'Cocktails', 15000),
  ('Getränke', 'Eis', 5000),
  ('Gagen', 'L''Ovale', 25000),
  ('Gagen', 'R. Daneel Olivaw', 60000),
  ('Gagen', 'Juki P2', 25000),
  ('Gagen', 'DJ Alice', 10000),
  ('Gagen', 'DJ Willibald', 30000),
  ('Gagen', 'DJ Münz', 105000),
  ('Gagen', 'Feuershow', 15000),
  ('Materialmiete', 'Kühlwagen', 10000),
  ('Materialmiete', 'Becher', 15000),
  ('Materialmiete', 'Technik (Ton/Licht)', 30000),
  ('Deko', 'Deko-Material (Schätzung)', 50000),
  ('Sonstiges', 'Hüpfburg', 30000),
  ('Sonstiges', 'Werbung / Promo', 10000)
) AS v("kategorie", "titel", "cents")
WHERE EXISTS (SELECT 1 FROM "ressorts" WHERE "hatFinanzen" = true)
  AND NOT EXISTS (SELECT 1 FROM "budget_items" WHERE "beschreibung" = 'Schätzung (aus Budget 2023)');