"use client";

import { useEffect, useState } from "react";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase.jsx";
import Logo from "../components/common/Logo.jsx";
import ProtectedRoute from "../components/common/ProtectedRoute.jsx";
import { useUser } from "../context/UserContext";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const { user, role, authError, refreshSession } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupNombre, setSetupNombre] = useState("");

  const passwordResetSettings =
    typeof window === "undefined"
      ? undefined
      : {
          url: `${window.location.origin}/login`,
          handleCodeInApp: false,
        };

  useEffect(() => {
    if (user && role) {
      router.push("/dashboard");
    }
  }, [role, router, user]);

  const handleSetupAdmin = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error("Primero inicia sesión para crear el perfil admin.");
      return;
    }

    const promise = (async () => {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre: setupNombre }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo crear el perfil admin");
      await refreshSession();
      return data;
    })();

    await toast.promise(promise, {
      loading: "Creando perfil admin...",
      success: "Perfil admin creado",
      error: (err) => err?.message || "No se pudo crear perfil admin",
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const promise = signInWithEmailAndPassword(auth, email, password).then(
      () => {
        setTimeout(() => {
          router.push("/dashboard");
        }, 500);
      }
    );

    await toast.promise(promise, {
      loading: "Iniciando sesión...",
      success: "¡Bienvenido!",
      error: (err) => {
        console.error(
          "Error al iniciar sesión. Verifica tus credenciales.",
          err
        );
        return "Error al iniciar sesión. Verifica tus credenciales.";
      },
    });
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("Escribe tu correo para enviarte el enlace de recuperación.");
      return;
    }

    auth.languageCode = "es";

    const promise = sendPasswordResetEmail(auth, normalizedEmail, passwordResetSettings);

    await toast.promise(promise, {
      loading: "Enviando correo de recuperación...",
      success: "Revisa tu correo para definir una nueva contraseña.",
      error: (err) => err?.message || "No se pudo enviar el correo de recuperación.",
    });
  };

  return (
    <ProtectedRoute requireAuth={false}>
      <div className="main-container grid grid-cols-1 place-items-center bg-gray-50">
        <div
          id="login-content"
          className="bg-white rounded-lg shadow-lg w-96 items-center justify-center "
        >
          {authError ? (
            <div className="mx-6 mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {authError}
            </div>
          ) : null}

          {!role && user ? (
            <form onSubmit={handleSetupAdmin} className="mx-6 mt-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-4 text-sm text-yellow-900">
              <p className="font-semibold mb-2">Configurar primer administrador</p>
              <p className="mb-3 text-yellow-800">
                Si este es el primer ingreso del sistema, crea el perfil admin inicial.
              </p>
              <input
                type="text"
                placeholder="Tu nombre completo"
                className="w-full border border-yellow-300 rounded px-3 py-2 mb-3 text-black bg-white"
                value={setupNombre}
                onChange={(e) => setSetupNombre(e.target.value)}
                required
              />
              <button
                type="submit"
                className="w-full bg-yellow-600 text-white py-2 rounded-xl hover:bg-yellow-700 cursor-pointer"
              >
                Crear perfil admin
              </button>
            </form>
          ) : null}

          <div className="flex justify-center ">
            <Logo />
          </div>
          <form onSubmit={handleLogin} className="text-black">
            <div className="email-password-container">
              <label className="block text-gray-700 font-bold">Email</label>
              <input
                type="email"
                placeholder="Type your email"
                className="w-full border border-gray-300 rounded input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="email-password-container">
              <label className="block text-gray-700  font-bold">Password</label>
              <input
                type="password"
                placeholder="Type your password"
                className="w-full border border-gray-300 rounded input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="px-6 pb-4 text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-blue-700 hover:text-blue-900"
              >
                Olvidé mi contraseña
              </button>
            </div>

            <button
              id="login-button"
              type="submit"
              className="w-full bg-black text-white py-2 rounded-xl hover:bg-gray-800 cursor-pointer"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
