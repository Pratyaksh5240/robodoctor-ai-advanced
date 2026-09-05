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
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  setDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

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

  // Listen to Firestore dependents collection when user is logged in,
  // or read from localStorage when in Guest Mode
  useEffect(() => {
    if (!user) {
      if (typeof window !== "undefined") {
        const savedLocal = localStorage.getItem(LOCAL_DEPENDENTS_KEY);
        if (savedLocal) {
          try {
            const parsed = JSON.parse(savedLocal) as Dependent[];
            setDependents(parsed);
          } catch {
            setDependents([]);
          }
        } else {
          setDependents([]);
        }
      }
      setLoadingDependents(false);
      return;
    }

    setLoadingDependents(true);
    const depsRef = collection(db, "users", user.uid, "dependents");
    const q = query(depsRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Dependent[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Dependent, "id">),
        }));
        setDependents(list);
        setLoadingDependents(false);

        const currentSelectedId = activeProfileIdRef.current;
        if (currentSelectedId && !list.some((d) => d.id === currentSelectedId)) {
          setActiveProfileId(null);
        }
      },
      (error) => {
        console.error("Error loading dependents from Firestore:", error);
        setLoadingDependents(false);
      }
    );

    return () => unsubscribe();
  }, [user, setActiveProfileId]);

  const addDependent = async (data: {
    name: string;
    relationship: string;
    age?: number;
    gender?: string;
  }): Promise<string> => {
    const createdAt = Date.now();

    if (!user) {
      // Guest Mode: Store locally in localStorage
      const localId = `dep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newDependent: Dependent = { id: localId, ...data, createdAt };
      const updatedList = [...dependents, newDependent];
      setDependents(updatedList);
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_DEPENDENTS_KEY, JSON.stringify(updatedList));
      }
      return localId;
    }

    // Signed-in User: Synchronously generate doc ID and update local state, then save to Firestore
    const depsRef = collection(db, "users", user.uid, "dependents");
    const newDocRef = doc(depsRef);
    const newId = newDocRef.id;

    const newDependent: Dependent = { id: newId, ...data, createdAt };
    setDependents((prev) => [...prev, newDependent]);

    // Save in background to Firestore without blocking the UI modal response
    void setDoc(newDocRef, {
      ...data,
      createdAt,
    }).catch((err) => {
      console.error("Error writing family member to Firestore:", err);
    });

    return newId;
  };

  const deleteDependent = async (id: string): Promise<void> => {
    if (!user) {
      // Guest Mode: Remove locally
      const updatedList = dependents.filter((d) => d.id !== id);
      setDependents(updatedList);
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_DEPENDENTS_KEY, JSON.stringify(updatedList));
      }
      if (activeProfileIdRef.current === id) {
        setActiveProfileId(null);
      }
      return;
    }

    // Signed-in User: Delete from Firestore
    const docRef = doc(db, "users", user.uid, "dependents", id);
    await deleteDoc(docRef);
    if (activeProfileIdRef.current === id) {
      setActiveProfileId(null);
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
