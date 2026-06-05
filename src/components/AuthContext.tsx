"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/apiClient";
import type { User } from "@/lib/uiTypes";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ mustChangePassword: boolean }>;
  register: (input: { name: string; email: string; password: string; code?: string }) => Promise<void>;
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

  const register = useCallback(
    async (input: { name: string; email: string; password: string; code?: string }) => {
      await api.post("/auth/register", input);
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth muss innerhalb von AuthProvider verwendet werden");
  return ctx;
}
