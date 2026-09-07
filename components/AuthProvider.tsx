"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@/lib/auth";
import { onAuthStateChanged, auth } from "@/lib/auth";

const GUEST_SESSION_KEY = "robodoctor-guest-session";

type AuthContextValue = {
  user: User | null;
  guestMode: boolean;
  loading: boolean;
  startGuestSession: () => void;
  clearGuestSession: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  guestMode: false,
  loading: true,
  startGuestSession: () => {},
  clearGuestSession: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setGuestMode(window.localStorage.getItem(GUEST_SESSION_KEY) === "true");
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (nextUser && typeof window !== "undefined") {
        window.localStorage.removeItem(GUEST_SESSION_KEY);
        setGuestMode(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const startGuestSession = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GUEST_SESSION_KEY, "true");
    }
    setGuestMode(true);
  };

  const clearGuestSession = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(GUEST_SESSION_KEY);
    }
    setGuestMode(false);
  };

  return (
    <AuthContext.Provider value={{ user, guestMode, loading, startGuestSession, clearGuestSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
