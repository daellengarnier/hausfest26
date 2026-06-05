import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hausfest 26 – Orga",
    short_name: "Hausfest 26",
    description: "Kollaborative Organisation des Hausfests der Spinnerei",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#6366f1",
    lang: "de",
    icons: [
      { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
      { src: "/maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
