// Minimaler Service Worker: App-Shell offline verfügbar (Network-First mit
// Cache-Fallback). API-Aufrufe werden bewusst NIE gecacht (keine Offline-Daten im MVP).
const CACHE = "hausfest-shell-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// Web-Push: Benachrichtigung anzeigen.
self.addEventListener("push", (event) => {
  let data = { title: "Hausfest 26", body: "Neue Benachrichtigung", url: "/inbox" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {
    /* ignorieren */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/pwa-192x192.png",
      badge: "/favicon-64.png",
      data: { url: data.url || "/inbox" },
      tag: data.tag,
    }),
  );
});

// Klick auf die Benachrichtigung: App öffnen / passenden Screen fokussieren.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/inbox";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.pathname.startsWith("/api")) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request).then((hit) => hit || caches.match("/"))),
  );
});
