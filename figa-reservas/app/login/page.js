"use client"; // Necesario en componentes interactivos

import { useRouter } from "next/navigation"; // Usa `next/navigation` en el App Router
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../lib/firebase.js"; // Asegúrate de que la ruta es correcta

export default function LoginPage() {
  const router = useRouter();

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      router.push("/dashboard"); // Redirige al dashboard tras login
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <button className="bg-blue-500 text-white p-4 rounded" onClick={login}>
        Iniciar Sesión con Google
      </button>
    </div>
  );
}
