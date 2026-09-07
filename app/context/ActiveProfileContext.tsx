"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "@/components/AuthProvider";

export type Dependent = {
  id: string;
  name: string;
  relationship: string;
  age?: number;
  gender?: string;
  createdAt: number;
};

type ActiveProfileContextType = {
  activeProfileId: string | null; // null = Myself (Account owner)
  activeProfile: Dependent | null;
  dependents: Dependent[];
  loadingDependents: boolean;
  setActiveProfileId: (id: string | null) => void;
  addDependent: (data: {
    name: string;
    relationship: string;
    age?: number;
    gender?: string;
  }) => Promise<string>;
  deleteDependent: (id: string) => Promise<void>;
};

const ActiveProfileContext = createContext<ActiveProfileContextType | null>(null);

const STORAGE_KEY = "robodoctor-active-profile";
const LOCAL_DEPENDENTS_KEY = "robodoctor-dependents-local";

export function ActiveProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [loadingDependents, setLoadingDependents] = useState<boolean>(true);

  const activeProfileIdRef = useRef<string | null>(activeProfileId);
  activeProfileIdRef.current = activeProfileId;

  // Restore active profile selection from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setActiveProfileIdState(saved === "myself" ? null : saved);
      }
    }
  }, []);

  const setActiveProfileId = useCallback((id: string | null) => {
    setActiveProfileIdState(id);
    activeProfileIdRef.current = id;
    if (typeof window !== "undefined") {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.setItem(STORAGE_KEY, "myself");
      }
    }
  }, []);

  // Load dependents from MongoDB API or local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLocal = localStorage.getItem(LOCAL_DEPENDENTS_KEY);
      if (savedLocal) {
        try {
          const parsed = JSON.parse(savedLocal) as Dependent[];
          setDependents(parsed);
        } catch {}
      }
    }

    if (!user || user.uid.startsWith("user_guest_")) {
      setLoadingDependents(false);
      return;
    }

    setLoadingDependents(true);
    fetch(`/api/dependents?userId=${encodeURIComponent(user.uid)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.dependents)) {
          setDependents(data.dependents);
          if (typeof window !== "undefined") {
            localStorage.setItem(LOCAL_DEPENDENTS_KEY, JSON.stringify(data.dependents));
          }
          const currentSelectedId = activeProfileIdRef.current;
          if (currentSelectedId && !data.dependents.some((d: Dependent) => d.id === currentSelectedId)) {
            setActiveProfileId(null);
          }
        }
      })
      .catch((err) => {
        console.warn("Failed to load dependents from MongoDB API:", err);
      })
      .finally(() => {
        setLoadingDependents(false);
      });
  }, [user, setActiveProfileId]);

  const addDependent = async (data: {
    name: string;
    relationship: string;
    age?: number;
    gender?: string;
  }): Promise<string> => {
    const createdAt = Date.now();
    const localId = `dep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newDependent: Dependent = { id: localId, ...data, createdAt };
    const updatedList = [...dependents, newDependent];
    setDependents(updatedList);

    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_DEPENDENTS_KEY, JSON.stringify(updatedList));
    }

    if (user && !user.uid.startsWith("user_guest_")) {
      try {
        const res = await fetch("/api/dependents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid, ...data }),
        });
        if (res.ok) {
          const result = await res.json();
          if (result.dependent && result.dependent.id) {
            setDependents((prev) =>
              prev.map((d) => (d.id === localId ? result.dependent : d))
            );
            return result.dependent.id;
          }
        }
      } catch (err) {
        console.warn("Failed to sync dependent to MongoDB API:", err);
      }
    }

    return localId;
  };

  const deleteDependent = async (id: string): Promise<void> => {
    const updatedList = dependents.filter((d) => d.id !== id);
    setDependents(updatedList);

    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_DEPENDENTS_KEY, JSON.stringify(updatedList));
    }
    if (activeProfileIdRef.current === id) {
      setActiveProfileId(null);
    }

    if (user && !user.uid.startsWith("user_guest_")) {
      try {
        await fetch(`/api/dependents?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(user.uid)}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.warn("Failed to delete dependent from MongoDB API:", err);
      }
    }
  };

  const activeProfile =
    activeProfileId && dependents.length > 0
      ? dependents.find((d) => d.id === activeProfileId) || null
      : null;

  return (
    <ActiveProfileContext.Provider
      value={{
        activeProfileId,
        activeProfile,
        dependents,
        loadingDependents,
        setActiveProfileId,
        addDependent,
        deleteDependent,
      }}
    >
      {children}
    </ActiveProfileContext.Provider>
  );
}

export function useActiveProfile() {
  const context = useContext(ActiveProfileContext);
  if (!context) {
    throw new Error("useActiveProfile must be used within an ActiveProfileProvider");
  }
  return context;
}
