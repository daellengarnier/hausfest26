"use client";

import { useEffect, useState } from "react";
import { api } from "./apiClient";
import type { UserLite } from "./uiTypes";

let cache: UserLite[] | null = null;

// Nutzerliste für @Mentions & Zuweisungen (einmal laden, dann cachen).
export function useUsers(): UserLite[] {
  const [users, setUsers] = useState<UserLite[]>(cache ?? []);
  useEffect(() => {
    if (cache) return;
    api
      .get<{ users: UserLite[] }>("/users")
      .then((d) => {
        cache = d.users;
        setUsers(d.users);
      })
      .catch(() => undefined);
  }, []);
  return users;
}
