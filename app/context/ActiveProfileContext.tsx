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

  // Listen to Firestore dependents collection when user is logged in
  useEffect(() => {
    if (!user) {
      setDependents([]);
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

        // Safely validate active profile ID against updated list
        const currentSelectedId = activeProfileIdRef.current;
        if (currentSelectedId && !list.some((d) => d.id === currentSelectedId)) {
          setActiveProfileId(null);
        }
      },
      (error) => {
        console.error("Error loading dependents:", error);
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
    if (!user) {
      throw new Error("Must be signed in to add a family member.");
    }
    const depsRef = collection(db, "users", user.uid, "dependents");
    const newDoc = await addDoc(depsRef, {
      ...data,
      createdAt: Date.now(),
    });
    return newDoc.id;
  };

  const deleteDependent = async (id: string): Promise<void> => {
    if (!user) return;
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
