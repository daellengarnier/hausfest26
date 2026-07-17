import "server-only";
import { EXPENSE_CATEGORIES } from "@/lib/finance";

export interface ScanResult {
  available: boolean; // false, wenn kein API-Key konfiguriert ist
  betragCents?: number;
  datum?: string; // YYYY-MM-DD
  haendler?: string;
  kategorie?: string;
  error?: string;
}

// Liest einen Beleg (Bild oder PDF) per Claude Vision aus. Ohne ANTHROPIC_API_KEY
// wird { available:false } geliefert (Client fällt auf manuelle Eingabe zurück).
export async function scanReceipt(dataB64: string, mime: string): Promise<ScanResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { available: false };

  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const isPdf = mime === "application/pdf";
  const mediaBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: dataB64 } }
    : { type: "image", source: { type: "base64", media_type: mime || "image/jpeg", data: dataB64 } };

  const prompt =
    "Das ist ein Kassenbeleg/eine Quittung. Antworte NUR mit einem JSON-Objekt, ohne Erklärung, mit den Feldern: " +
    '"betrag" (Gesamtbetrag/Total als Zahl, z. B. 12.50), ' +
    '"datum" (im Format YYYY-MM-DD oder null), ' +
    '"haendler" (Name des Geschäfts als String oder null), ' +
    `"kategorie" (genau eine von: ${EXPENSE_CATEGORIES.join(", ")}). ` +
    "Wähle die Kategorie anhand des Inhalts. Wenn unklar, nimm \"Sonstiges\".";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [{ role: "user", content: [mediaBlock, { type: "text", text: prompt }] }],
      }),
    });
    if (!res.ok) {
      return { available: true, error: `KI-Fehler ${res.status}` };
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.map((c) => c.text ?? "").join("") ?? "";
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return { available: true, error: "Kein Betrag erkannt" };
    const parsed = JSON.parse(m[0]) as { betrag?: number | string; datum?: string | null; haendler?: string | null; kategorie?: string };
    const betrag = typeof parsed.betrag === "string" ? parseFloat(parsed.betrag.replace(",", ".")) : parsed.betrag;
    const betragCents = betrag != null && Number.isFinite(betrag) ? Math.round(betrag * 100) : undefined;
    const datum = parsed.datum && /^\d{4}-\d{2}-\d{2}$/.test(parsed.datum) ? parsed.datum : undefined;
    return {
      available: true,
      betragCents,
      datum,
      haendler: parsed.haendler ?? undefined,
      kategorie: parsed.kategorie ?? undefined,
    };
  } catch (e) {
    return { available: true, error: (e as Error).message };
  }
}
