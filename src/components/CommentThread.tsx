"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/apiClient";
import { useUsers } from "@/lib/useUsers";
import { useAuth } from "./AuthContext";
import { Avatar, EmptyState, MentionText, Spinner } from "./Ui";
import { relTime } from "@/lib/uiUtil";
import type { Comment, UserLite } from "@/lib/uiTypes";

export function CommentThread({ parentTyp, parentId }: { parentTyp: "todo" | "ressort"; parentId: number }) {
  const { user } = useAuth();
  const users = useUsers();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const load = () =>
    api
      .get<{ comments: Comment[] }>(`/comments?parentTyp=${parentTyp}&parentId=${parentId}`)
      .then((d) => setComments(d.comments))
      .catch(() => setComments([]));

  useEffect(() => {
    setComments(null);
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentTyp, parentId]);

  const detectMention = (value: string, caret: number) => {
    const upto = value.slice(0, caret);
    const m = /@([\p{L}0-9._-]*)$/u.exec(upto);
    setMentionQuery(m ? m[1].toLowerCase() : null);
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    detectMention(e.target.value, e.target.selectionStart ?? e.target.value.length);
  };

  const insertMention = (u: UserLite) => {
    const ta = taRef.current;
    const caret = ta?.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@([\p{L}0-9._-]*)$/u, `@${u.name} `);
    const after = text.slice(caret);
    setText(before + after);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      ta?.focus();
      const pos = before.length;
      ta?.setSelectionRange(pos, pos);
    });
  };

  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const { comment } = await api.post<{ comment: Comment }>("/comments", {
        parentTyp,
        parentId,
        text: text.trim(),
      });
      setComments((prev) => [...(prev ?? []), comment]);
      setText("");
      setMentionQuery(null);
      window.dispatchEvent(new Event("hausfest:refresh-inbox"));
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    } finally {
      setSending(false);
    }
  };

  const suggestions =
    mentionQuery === null
      ? []
      : users.filter((u) => u.name.toLowerCase().replace(/\s+/g, "").startsWith(mentionQuery)).slice(0, 6);

  return (
    <div className="space-y-3">
      {comments === null ? (
        <Spinner />
      ) : comments.length === 0 ? (
        <EmptyState
          icon="💬"
          title="Noch keine Diskussion"
          hint="Schreib den ersten Kommentar – nutze @Name, um jemanden zu erwähnen."
        />
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const mine = c.autorUserId === user?.id;
            return (
              <li key={c.id} className="flex gap-2.5">
                <Avatar name={c.autorName ?? "?"} color={c.autorColor ?? "#94a3b8"} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">
                      {c.autorName ?? "Unbekannt"}
                      {mine && " (du)"}
                    </span>
                    <span className="text-xs text-slate-400">{relTime(c.createdAt)}</span>
                  </div>
                  <div className="mt-0.5 rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2 text-sm text-slate-800">
                    <MentionText text={c.text} mentions={c.mentions} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div ref={bottomRef} />

      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white px-4 pb-2 pt-3">
        <div className="relative">
          {suggestions.length > 0 && (
            <div className="absolute bottom-full mb-2 w-56 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
              {suggestions.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => insertMention(u)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <Avatar name={u.name} color={u.avatarColor} size={24} />
                  {u.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={taRef}
              value={text}
              onChange={onChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder="Kommentar … (@ für Mention)"
              className="input max-h-32 min-h-[44px] flex-1 resize-none py-2.5"
            />
            <button onClick={submit} disabled={!text.trim() || sending} className="btn-primary h-11 px-4">
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
