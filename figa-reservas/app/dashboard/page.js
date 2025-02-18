"use client";

import { useEffect, useState } from "react";
import { auth } from "../lib/firebase.js";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import Image from "next/image";

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

  const handleNavigate = () => {
    router.push("/reservas");
  };

  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };
  const [reservations, setReservations] = useState([
    {
      id: 323,
      provider: "Provider Example",
      cost: "₡180.000",
      pickUp: "8:00 AM",
      dropOff: "12:00 MD",
      adults: 3,
      children: 0,
      client: "Termales del bosque",
      dateSubmitted: "15/02/2025",
      reservationDate: "03/02/2025",
    },
    {
      id: 324,
      provider: "Provider Example",
      cost: "₡110.000",
      pickUp: "10:30 AM",
      dropOff: "1:00 PM",
      adults: 2,
      children: 1,
      client: "Hotel Campestre",
      dateSubmitted: "15/02/2025",
      reservationDate: "10/02/2025",
    },
    {
      id: 325,
      provider: "Provider Example",
      cost: "₡300.020",
      pickUp: "7:30 AM",
      dropOff: "10:00 AM",
      adults: 5,
      children: 1,
      client: "Volcano Lodge",
      dateSubmitted: "15/02/2025",
      reservationDate: "06/02/2025",
    },
  ]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      {/* Logo */}
      <Image
        src="/logo.PNG"
        alt="FIGA Travel Logo"
        width={120}
        height={80}
        className="mb-6"
      />

      {/* Tabla */}
      <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-5xl">
        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">ID</th>
              <th className="border p-2">Provider</th>
              <th className="border p-2">Cost</th>
              <th className="border p-2">Pick Up</th>
              <th className="border p-2">Drop Off</th>
              <th className="border p-2">Adults</th>
              <th className="border p-2">Children</th>
              <th className="border p-2">Client</th>
              <th className="border p-2">Date Submitted</th>
              <th className="border p-2">Reservation Date</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((res) => (
              <tr key={res.id} className="text-center">
                <td className="border p-2">{res.id}</td>
                <td className="border p-2">{res.provider}</td>
                <td className="border p-2">{res.cost}</td>
                <td className="border p-2">{res.pickUp}</td>
                <td className="border p-2">{res.dropOff}</td>
                <td className="border p-2">{res.adults}</td>
                <td className="border p-2">{res.children}</td>
                <td className="border p-2">{res.client}</td>
                <td className="border p-2">{res.dateSubmitted}</td>
                <td className="border p-2">{res.reservationDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Botón de Crear Reserva */}
      <button
        onClick={handleNavigate}
        className="fixed bottom-4 left-4 bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-900"
      >
        <span className="mr-2">📁</span> Create
      </button>
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
    </div>
  );
}
