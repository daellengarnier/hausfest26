"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { api } from "@/lib/apiClient";
import { Avatar, Spinner } from "@/components/Ui";

const TABS = [
  { href: "/", label: "Übersicht", icon: "🏠", exact: true },
  { href: "/mine", label: "Meine Sachen", icon: "✅", exact: false },
  { href: "/meetings", label: "Sitzungen", icon: "📅", exact: false },
  { href: "/inbox", label: "Inbox", icon: "🔔", exact: false, badge: true },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auth-Guard.
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.mustChangePassword) router.replace("/passwort?forced=1");
  }, [loading, user, router]);

  // Inbox-Badge per Polling (bewusst kein WebSocket im MVP).
  useEffect(() => {
    if (!user) return;
    let active = true;
    const poll = async () => {
      try {
        const { count } = await api.get<{ count: number }>("/activity/unread-count");
        if (active) setUnread(count);
      } catch {
        /* ignorieren */
      }
    };
    poll();
    const id = setInterval(poll, 20000);
    const onFocus = () => poll();
    const onPing = () => poll();
    window.addEventListener("focus", onFocus);
    window.addEventListener("hausfest:refresh-inbox", onPing);
    return () => {
      active = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("hausfest:refresh-inbox", onPing);
    };
  }, [user]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (loading || !user || user.mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Lade …" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-slate-100">
      <header className="pt-safe sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white">
              <span className="h-3 w-3 rounded-full border-2 border-white" />
            </span>
            <span className="text-lg font-bold tracking-tight">Hausfest 26</span>
          </Link>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-full p-0.5 active:scale-95">
              <Avatar name={user.name} color={user.avatarColor} size={34} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200">
                <div className="border-b border-slate-100 px-4 py-2">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                  {user.rolle === "admin" && <span className="chip mt-1 bg-accent/10 text-accent-dark">Admin</span>}
                </div>
                {user.rolle === "admin" && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/admin");
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                  >
                    ⚙️ Administration
                  </button>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/passwort");
                  }}
                  className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                >
                  🔑 Passwort ändern
                </button>
                <button
                  onClick={async () => {
                    await logout();
                    router.replace("/login");
                  }}
                  className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  🚪 Abmelden
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-28">{children}</main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-2xl border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="grid grid-cols-4">
          {TABS.map((t) => {
            const isActive = t.exact ? pathname === t.href : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
                  isActive ? "text-accent" : "text-slate-500"
                }`}
              >
                <span className="relative text-xl leading-none">
                  {t.icon}
                  {t.badge && unread > 0 && (
                    <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </span>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
