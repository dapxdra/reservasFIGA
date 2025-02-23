"use client";

import { useEffect, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase.js";
import Image from "next/image";

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
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard"); // Redirigir después del login
    } catch (err) {
      setError("Credenciales incorrectas. Intenta de nuevo.");
      console.error("Error de inicio de sesión:", err);
    }
  };

  return (
    <div className="main-container grid grid-cols-1 place-items-center bg-gray-50">
      <Image
        src="/logo.png"
        alt="FIGA Logo"
        width={280}
        height={280}
        className=""
      />
      <div id="login-content" className="bg-white rounded-lg shadow-lg w-96">
        {error && <p className="text-red-500 text-center">{error}</p>}

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
