"use client";

import { useEffect, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase.jsx";
import Logo from "../components/common/Logo.jsx";
import { notifySuccess, notifyError } from "../utils/notify";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        router.push("/dashboard"); // Redirigir si no está autenticado
      } else {
        setUser(user);
      }
    });

    return () => unsubscribe();
  }, [router]);

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

  return (
    <div className="main-container grid grid-cols-1 place-items-center bg-gray-50">
      <div
        id="login-content"
        className="bg-white rounded-lg shadow-lg w-96 items-center justify-center "
      >
        {error && <p className="text-red-500 text-center">{error}</p>}
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
  );
}
