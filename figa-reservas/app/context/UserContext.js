"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase.jsx";
import { normalizeRole } from "../lib/roles.js";
const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const clearSession = useCallback(() => {
    setUser(null);
    setProfile(null);
    setRole("");
    setAuthError("");
  }, []);

  const refreshSession = useCallback(async (nextUser) => {
    if (!nextUser) {
      clearSession();
      return;
    }

    const token = await nextUser.getIdToken();
    const res = await fetch("/api/auth/session", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok) {
      setAuthError(data.message || "No se pudo validar tu sesión.");
      setProfile(null);
      setRole("");
      if (data.error !== "ProfileNotFound") {
        await signOut(auth);
      }
      return;
    }

    setAuthError("");
    setProfile(data);
    setRole(normalizeRole(data.role || ""));
  }, [clearSession]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (nextUser) => {
      setLoading(true);
      if (!nextUser) {
        clearSession();
        setLoading(false);
        return;
      }

      setUser(nextUser);
      try {
        await refreshSession(nextUser);
      } catch (error) {
        console.error("Error cargando sesión:", error);
        setAuthError("No se pudo validar tu sesión.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [clearSession, refreshSession]);

  const value = useMemo(
    () => ({
      user,
      profile,
      role,
      loading,
      authError,
      setUser,
      refreshSession: () => refreshSession(auth.currentUser),
    }),
    [authError, loading, profile, refreshSession, role, user]
  );

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser debe usarse dentro de UserProvider");
  }
  return context;
}
