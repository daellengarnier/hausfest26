"use client";

import { useEffect, useState, type ReactNode } from "react";
import { initials } from "@/lib/uiUtil";
import { Icon } from "@/components/Icon";
import type { UserLite } from "@/lib/uiTypes";

export function Avatar({
  name,
  color,
  size = 32,
  ring = false,
  userId,
  showName = true,
}: {
  name: string;
  color: string;
  size?: number;
  ring?: boolean;
  userId?: number | null;
  showName?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const showImg = userId != null && !imgError;
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ${
        ring ? "ring-2 ring-white" : ""
      } ${showName ? "cursor-pointer" : ""}`}
      style={{ background: color, width: size, height: size, fontSize: size * 0.4 }}
      title={name}
      role={showName ? "button" : undefined}
      onClick={
        showName
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent("hausfest:name", { detail: name }));
            }
          : undefined
      }
    >
      <span className="select-none">{initials(name)}</span>
      {showImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/users/${userId}/avatar`}
          alt={name}
          draggable={false}
          onError={() => setImgError(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
}

export function AvatarStack({ users, size = 26 }: { users: UserLite[]; size?: number }) {
  if (users.length === 0) return null;
  return (
    <span className="flex -space-x-2">
      {users.slice(0, 4).map((u) => (
        <Avatar key={u.id} name={u.name} color={u.avatarColor} size={size} ring userId={u.id} />
      ))}
      {users.length > 4 && (
        <span
          className="inline-flex items-center justify-center rounded-full bg-slate-300 font-semibold text-slate-700 ring-2 ring-white"
          style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
          +{users.length - 4}
        </span>
      )}
    </span>
  );
}

// Zeigt beim Tippen auf ein Profilbild kurz den ganzen Namen (fixe Pille unten).
export function NameToast() {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      setName((e as CustomEvent<string>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setName(null), 1600);
    };
    window.addEventListener("hausfest:name", on);
    return () => {
      window.removeEventListener("hausfest:name", on);
      clearTimeout(timer);
    };
  }, []);
  if (!name) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      <span className="rounded-full bg-ink/90 px-4 py-2 text-sm font-semibold text-white shadow-lg">{name}</span>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-accent" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  icon?: string; // wird ignoriert (Kompatibilität); es wird ein einheitliches Icon gezeigt
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-10 text-center">
      <span className="mb-1 grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
        <Icon name="leaf" size={24} />
      </span>
      <p className="font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-xs text-sm text-stone-500">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-2xl leading-none text-slate-400 hover:bg-slate-100">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// Rendert Kommentartext und hebt @Mentions hervor.
export function MentionText({ text, mentions }: { text: string; mentions?: { name: string }[] }) {
  const names = new Set((mentions ?? []).flatMap((m) => [m.name.toLowerCase(), m.name.split(/\s+/)[0].toLowerCase()]));
  const parts = text.split(/(@[\p{L}0-9._-]+)/gu);
  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (part.startsWith("@") && names.has(part.slice(1).toLowerCase())) {
          return (
            <span key={i} className="rounded bg-accent/10 px-1 font-medium text-accent-dark">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
