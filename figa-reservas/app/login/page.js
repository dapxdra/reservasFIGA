"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase.js";
import Image from "next/image";


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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
    <div className="grid grid-cols-1 place-items-center h-screen bg-gray-100">

      <Image
        src="/logo.PNG"
        alt="FIGA Logo"
        width={200}
        height={200}
        className=""
      />

      <div id="divlogin" className="border-1 border-black">

        {error && <p className="text-red-500 mb-2">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-4 text-black">
            <div>
              <label className="text-gray-700">Email</label>
              <input
                type="email"
                placeholder="Type your email"
                className="w-full p-2 border border-gray-300 rounded mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-gray-700">Password</label>
              <input
                type="password"
                placeholder="Type your password"
                className="w-full p-2 border border-gray-300 rounded mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
            >
              Sign in
            </button>
        </form>
      </div>
    </div>
  );
}
