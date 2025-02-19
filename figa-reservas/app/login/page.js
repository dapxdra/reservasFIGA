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
<<<<<<< HEAD
    <div className="main-container grid grid-cols-1 place-items-center bg-gray-50">
      <Image
        src="/logo.PNG"
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

          <button id="login-button"
            type="submit"
            className="w-full bg-black text-white py-2 rounded-xl hover:bg-gray-800 cursor-pointer"
          >
            Sign in
          </button>
=======
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
>>>>>>> 5d1fee73e1673c04f635ea18de013efa24b2980f
        </form>
      </div>
    </div>
  );
}
