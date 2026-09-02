-- Todos dürfen künftig ohne Ressort existieren (allgemeine Todo-Liste).
ALTER TABLE "todos" ALTER COLUMN "ressortId" DROP NOT NULL;
