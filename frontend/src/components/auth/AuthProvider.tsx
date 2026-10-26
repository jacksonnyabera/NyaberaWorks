"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { registerAccount, signIn, signOut } from "@/lib/auth-api";
import { hasSessionHint, refreshSession } from "@/lib/auth-session";
import type { User } from "@/lib/auth-types";

type Status = "loading" | "anonymous" | "authenticated";

type AuthContextValue = {
  status: Status;
  user: User | null;
  /** True after the person chose to log out, so pages send them home rather than to the login form. */
  loggedOut: boolean;
  login: (values: { email: string; password: string; totpCode?: string }) => Promise<User>;
  register: (values: { name: string; email: string; phone: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    // No sign-in flag means no network request: the answer is "anonymous" straight away.
    const pending = hasSessionHint() ? refreshSession() : Promise.resolve(null);
    pending.then((session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setStatus(session ? "authenticated" : "anonymous");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (values: { email: string; password: string; totpCode?: string }) => {
    const signedIn = await signIn(values);
    setUser(signedIn);
    setLoggedOut(false);
    setStatus("authenticated");
    return signedIn;
  }, []);

  const register = useCallback(
    async (values: { name: string; email: string; phone: string; password: string }) => {
      const created = await registerAccount(values);
      setUser(created);
      setLoggedOut(false);
      setStatus("authenticated");
      return created;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await signOut();
    } finally {
      setLoggedOut(true);
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const value = useMemo(
    () => ({ status, user, loggedOut, login, register, logout, setUser }),
    [status, user, loggedOut, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
