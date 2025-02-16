"use client";

import { useEffect, useState } from "react";
import { auth } from "../lib/firebase.js";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login"); // Redirigir si no está autenticado
      } else {
        setUser(user);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">¡Bienvenido, {user?.email}!</h1>
      <p>Este es tu dashboard.</p>
      <button
        onClick={logout}
        className="mt-4 bg-red-500 text-white p-2 rounded"
      >
        Cerrar Sesión
      </button>
    </div>
  );
}
