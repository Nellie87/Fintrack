import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, getToken, setToken, setUnauthorizedHandler } from "../api/client";
import type { AuthResponse, User } from "../api/types";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./auth-context";

/**
 * Holds the logged-in analyst. On first load, a stored token is checked with
 * GET /api/auth/me; any later 401 from the API logs the analyst out.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (getToken() ? "checking" : "anonymous"));

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setStatus("anonymous");
    queryClient.clear(); // never show one analyst's cached data to the next
  }, [queryClient]);

  // Restore the session after a refresh.
  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    api<User>("/api/auth/me")
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!cancelled) logout();
      });
    return () => {
      cancelled = true;
    };
  }, [logout]);

  // An expired or revoked token anywhere in the app ends the session.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const startSession = useCallback(({ token, user }: AuthResponse) => {
    setToken(token);
    setUser(user);
    setStatus("authenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      logout,
      login: async (email, password) =>
        startSession(await api<AuthResponse>("/api/auth/login", { method: "POST", body: { email, password } })),
      register: async (name, email, password) =>
        startSession(
          await api<AuthResponse>("/api/auth/register", { method: "POST", body: { name, email, password } }),
        ),
    }),
    [status, user, logout, startSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
