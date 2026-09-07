"use client";

export type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
};

export type Auth = {
  currentUser: User | null;
};

const USER_STORAGE_KEY = "robodoctor_user";

function getInitialUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const auth: Auth = {
  currentUser: getInitialUser(),
};

const listeners = new Set<(user: User | null) => void>();

function notifyListeners(user: User | null) {
  auth.currentUser = user;
  if (typeof window !== "undefined") {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }
  listeners.forEach((callback) => {
    try {
      callback(user);
    } catch (e) {
      console.error("Auth listener error:", e);
    }
  });
}

export function onAuthStateChanged(
  _auth: Auth,
  callback: (user: User | null) => void
): () => void {
  listeners.add(callback);

  // Read initial user
  const initial = auth.currentUser || getInitialUser();
  callback(initial);

  // Sync with server session in background
  if (typeof window !== "undefined") {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          notifyListeners(data.user);
        } else if (initial && !initial.uid.startsWith("user_guest_")) {
          // Keep local session if server didn't provide cookie
        }
      })
      .catch(() => {
        // keep local
      });
  }

  return () => {
    listeners.delete(callback);
  };
}

export async function signInWithEmailAndPassword(
  _auth: Auth,
  email: string,
  password: string
): Promise<{ user: User }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Login failed");
  }

  notifyListeners(data.user);
  return { user: data.user };
}

export async function createUserWithEmailAndPassword(
  _auth: Auth,
  email: string,
  password: string
): Promise<{ user: User }> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Signup failed");
  }

  notifyListeners(data.user);
  return { user: data.user };
}

export async function updateProfile(
  user: User,
  profile: { displayName?: string }
): Promise<void> {
  const updatedUser: User = {
    ...user,
    displayName: profile.displayName || user.displayName,
  };
  notifyListeners(updatedUser);

  try {
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.uid,
        dependentId: "myself",
        profile: { patientName: profile.displayName },
      }),
    });
  } catch (err) {
    console.warn("updateProfile sync warning:", err);
  }
}

export async function signOut(_auth: Auth): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {}
  notifyListeners(null);
}
