"use client";

import { useEffect, type ReactNode } from "react";
import { AuthProvider } from "@/components/AuthContext";

export function Providers({ children }: { children: ReactNode }) {
  // Service Worker registrieren (PWA / Offline-Shell).
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
}
