"use client";

import { Avatar } from "./Ui";
import { useUsers } from "@/lib/useUsers";

// Mehrfachauswahl von Zuständigen als antippbare Chips.
export function AssigneePicker({
  selected,
  onChange,
}: {
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const users = useUsers();
  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="flex flex-wrap gap-2">
      {users.map((u) => {
        const active = selected.includes(u.id);
        return (
          <button
            type="button"
            key={u.id}
            onClick={() => toggle(u.id)}
            className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm transition ${
              active ? "border-accent bg-accent/10 text-accent-dark" : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            <Avatar name={u.name} color={u.avatarColor} size={22} />
            {u.name}
          </button>
        );
      })}
    </div>
  );
}
