"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/apiClient";
import type { User } from "@/lib/uiTypes";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ mustChangePassword: boolean }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user } = await api.get<{ user: User }>("/auth/me");
      setUser(user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ ok: boolean; mustChangePassword: boolean }>("/auth/login", { email, password });
      await refresh();
      return { mustChangePassword: res.mustChangePassword };
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth muss innerhalb von AuthProvider verwendet werden");
  return ctx;
}
