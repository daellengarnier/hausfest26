// Client-Helfer für Web-Push (Abonnieren im Browser).

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export type PushResult = { ok: boolean; error?: string };

// Erlaubnis holen (falls nötig) und dieses Gerät serverseitig registrieren.
export async function enablePush(): Promise<PushResult> {
  if (!pushSupported()) return { ok: false, error: "Dein Browser unterstützt keine Benachrichtigungen." };
  const vapid = await fetch("/api/push/vapid").then((r) => r.json()).catch(() => null);
  if (!vapid?.publicKey) return { ok: false, error: "Push ist auf dem Server noch nicht konfiguriert." };

  if (Notification.permission === "default") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, error: "Benachrichtigungen wurden nicht erlaubt." };
  } else if (Notification.permission === "denied") {
    return { ok: false, error: "Benachrichtigungen sind im Browser blockiert – bitte in den Einstellungen erlauben." };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid.publicKey) as BufferSource });
    }
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    });
    if (res.ok) {
      try {
        window.dispatchEvent(new Event("hausfest:push-enabled"));
      } catch {
        /* ignorieren */
      }
    }
    return { ok: res.ok, error: res.ok ? undefined : "Abo konnte nicht gespeichert werden." };
  } catch {
    return { ok: false, error: "Abo fehlgeschlagen." };
  }
}

// Beim App-Start still auffrischen, falls schon erlaubt.
export async function refreshPushSilently(): Promise<void> {
  if (!pushSupported() || Notification.permission !== "granted") return;
  await enablePush().catch(() => undefined);
}
