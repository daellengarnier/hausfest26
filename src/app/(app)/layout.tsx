"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { api } from "@/lib/apiClient";
import { Avatar, Spinner, Modal, NameToast } from "@/components/Ui";
import { InstallInstructions } from "@/components/InstallInstructions";
import { PushPrompt } from "@/components/PushPrompt";
import { enablePush, refreshPushSilently, pushSupported } from "@/lib/pushClient";
import { Icon, type IconName } from "@/components/Icon";

const TABS: { href: string; label: string; icon: IconName; exact: boolean; badge?: boolean }[] = [
  { href: "/", label: "Übersicht", icon: "home", exact: true },
  { href: "/mine", label: "Meine Sachen", icon: "tasks", exact: false },
  { href: "/einkauf", label: "Einkauf", icon: "cart", exact: false },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pushMsg, setPushMsg] = useState("");
  const [pushBusy, setPushBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshPushSilently();
  }, []);

  const enableNotifications = async () => {
    setPushBusy(true);
    setPushMsg("");
    const r = await enablePush();
    if (r.ok) {
      await fetch("/api/push/test", { method: "POST", credentials: "include" }).catch(() => undefined);
      setPushMsg("Aktiviert – du solltest gleich eine Test-Benachrichtigung sehen.");
    } else {
      setPushMsg(r.error ?? "Fehlgeschlagen.");
    }
    setPushBusy(false);
  };

  const onAvatarFile = async (f: File) => {
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/users/avatar", { method: "POST", body: fd, credentials: "include" });
      if (res.ok) window.location.reload();
    } finally {
      setUploadingAvatar(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.mustChangePassword) router.replace("/passwort?forced=1");
  }, [loading, user, router]);

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
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <header className="pt-safe glass sticky top-0 z-30 border-b">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="brand-gradient grid h-9 w-9 place-items-center rounded-2xl text-white shadow-[var(--shadow-pop)]">
              <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
                <path d="M12 3 21 20 H3 Z" fill="currentColor" />
              </svg>
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-lg font-extrabold tracking-tight text-ink">
                Hausfest <span className="brand-text">26</span>
              </span>
              <span className="mt-0.5 text-[10px] font-medium text-stone-500">33 Jahre Via · 10 Jahre Spinnerei</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/inbox" className="relative grid h-10 w-10 place-items-center rounded-full text-stone-500 active:scale-95" aria-label="Benachrichtigungen">
              <Icon name="bell" size={22} />
              {unread > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-terra px-1 text-[10px] font-bold text-white ring-2 ring-[#e7eed9]">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen((o) => !o)} className="relative flex items-center gap-2 rounded-full p-0.5 active:scale-95">
              <Avatar name={user.name} color={user.avatarColor} size={34} userId={user.id} showName={false} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl bg-white py-1 shadow-lg ring-1 ring-stone-200">
                <div className="border-b border-stone-100 px-4 py-2">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-xs text-stone-500">{user.email}</p>
                  {user.rolle === "admin" && <span className="chip mt-1 bg-accent/10 text-accent-dark">Admin</span>}
                </div>
                <button onClick={() => { setMenuOpen(false); router.push("/inbox"); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-stone-50">
                  <Icon name="bell" size={17} className="text-stone-500" /> Inbox
                  {unread > 0 && (
                    <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-terra px-1 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>
                  )}
                </button>
                <button onClick={() => { setMenuOpen(false); avatarFileRef.current?.click(); }} disabled={uploadingAvatar} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-stone-50">
                  <Icon name="user" size={17} className="text-stone-500" /> {uploadingAvatar ? "Lädt …" : "Profilbild ändern"}
                </button>
                <button onClick={() => { setMenuOpen(false); setInstallOpen(true); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-stone-50">
                  <Icon name="download" size={17} className="text-stone-500" /> App installieren
                </button>
                {pushSupported() && (
                  <button onClick={enableNotifications} disabled={pushBusy} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-stone-50">
                    <Icon name="bell" size={17} className="text-stone-500" /> {pushBusy ? "Aktiviere …" : "Benachrichtigungen aktivieren"}
                  </button>
                )}
                {pushMsg && <p className="px-4 pb-2 text-xs text-stone-500">{pushMsg}</p>}
                {user.rolle === "admin" && (
                  <button onClick={() => { setMenuOpen(false); router.push("/admin"); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-stone-50">
                    <Icon name="gear" size={17} className="text-stone-500" /> Administration
                  </button>
                )}
                <button onClick={() => { setMenuOpen(false); router.push("/passwort"); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-stone-50">
                  <Icon name="key" size={17} className="text-stone-500" /> Passwort ändern
                </button>
                <button onClick={async () => { await logout(); router.replace("/login"); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">
                  <Icon name="logout" size={17} /> Abmelden
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">
        <PushPrompt />
        {children}
      </main>

      <nav className="pb-safe glass fixed inset-x-0 bottom-0 z-30 mx-auto max-w-2xl border-t">
        <div className="grid grid-cols-3">
          {TABS.map((t) => {
            const isActive = t.exact ? pathname === t.href : pathname.startsWith(t.href);
            return (
              <Link key={t.href} href={t.href} className="relative flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold">
                <span className={`relative grid h-7 w-14 place-items-center rounded-full transition-colors ${isActive ? "bg-accent/10 text-accent" : "text-stone-400"}`}>
                  <Icon name={t.icon} size={21} />
                  {t.badge && unread > 0 && (
                    <span className="absolute right-2.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-terra px-1 text-[10px] font-bold text-white ring-2 ring-[#e7eed9]">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </span>
                <span className={isActive ? "text-accent-dark" : "text-stone-500"}>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <input
        ref={avatarFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onAvatarFile(e.target.files[0])}
      />
      {installOpen && (
        <Modal open onClose={() => setInstallOpen(false)} title="App installieren" footer={<button className="btn-primary w-full" onClick={() => setInstallOpen(false)}>Alles klar</button>}>
          <InstallInstructions />
        </Modal>
      )}
      <NameToast />
    </div>
  );
}
