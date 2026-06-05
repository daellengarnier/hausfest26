-- Entfernt die ursprünglich (fälschlich) geseedeten Platzhalter-Accounts mit
-- der Beispiel-Domain @fest.felsenau.org. Ab jetzt registrieren sich die Leute
-- selbst mit ihrer eigenen E-Mail. Cascade räumt zugehörige Lead-Zuordnungen,
-- Sessions, Zuweisungen etc. auf. Idempotent (trifft beim 2. Lauf 0 Zeilen).
DELETE FROM users WHERE email LIKE '%@fest.felsenau.org';
