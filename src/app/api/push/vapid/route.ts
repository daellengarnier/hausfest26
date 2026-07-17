// Öffentlicher VAPID-Schlüssel für den Client (zum Abonnieren von Push).
export async function GET() {
  return Response.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
}
