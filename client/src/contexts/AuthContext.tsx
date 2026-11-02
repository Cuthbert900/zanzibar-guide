import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const TOKEN_KEY = "travelguide_token";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  favorites: Array<{ id: string; name: string }>;
  trips: Array<{ id: string; title: string; createdAt: string }>;
  bookingIds: string[];
}

export function userInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Thrown by login/register; `field` names the input the message belongs to, if any. */
export class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly field?: "name" | "email" | "password",
  ) {
    super(message);
  }
}

interface AuthState {
  user: AuthUser | null;
  /** "loading" until the stored token has been checked against the server */
  status: "loading" | "signedIn" | "signedOut";
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function postCredentials(path: string, body: Record<string, string>) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AuthRequestError(data.error || "Something went wrong. Please try again.", data.field);
  return data.data as { user: AuthUser; token: string };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("loading");

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setStatus("signedOut");
      return;
    }
    const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setUser(data.data);
      setStatus("signedIn");
      return;
    }
    // An expired or revoked token; a network failure keeps it for the next attempt.
    if (res?.status === 401) localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setStatus("signedOut");
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const startSession = useCallback((result: { user: AuthUser; token: string }) => {
    localStorage.setItem(TOKEN_KEY, result.token);
    setUser(result.user);
    setStatus("signedIn");
  }, []);

  const login = useCallback(
    async (email: string, password: string) => startSession(await postCredentials("/api/auth/login", { email, password })),
    [startSession],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) =>
      startSession(await postCredentials("/api/auth/register", { name, email, password })),
    [startSession],
  );

  const logout = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setStatus("signedOut");
    if (token) {
      await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, logout, refreshUser }),
    [user, status, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
