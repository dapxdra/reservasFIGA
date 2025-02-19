"use client";

import { useEffect, useState } from "react";
import { auth } from "../lib/firebase.js";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import Image from "next/image";
import { set } from "react-hook-form";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [reservas, setReservas] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login"); // Redirigir si no está autenticado
      } else {
        setUser(user);
      }
    });
    const fetchReservas = async () => {
      const response = await fetch("/api/reservas");
      const data = await response.json();
      setReservas(data);
    };

    fetchReservas();

    return () => unsubscribe();
  }, [router]);

  const handleNavigate = () => {
    router.push("/reservas");
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Estás seguro de eliminar esta reserva?")) return;
    await fetch(`/api/reservas/${id}`, { method: "DELETE" }); // Eliminar la reserva

    setReservas(reservas.filter((reserva) => reserva.id !== id)); // Actualizar la lista de reservas
  };

  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };

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
      <div id="dashContainer">
        <h1 id="dashTitle">Dashboard de Reservas</h1>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Proveedor</th>
              <th>ItinId</th>
              <th>Cliente</th>
              <th>PickUp</th>
              <th>DropOff</th>
              <th>Adultos</th>
              <th>Niños</th>
              <th>Precio</th>
              <th>Nota</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservas.map((reserva) => (
              <tr key={reserva.id}>
                <td>{reserva.id}</td>
                <td>{reserva.fecha}</td>
                <td>{reserva.hora}</td>
                <td>{reserva.proveedor}</td>
                <td>{reserva.itinId}</td>
                <td>{reserva.cliente}</td>
                <td>{reserva.pickUp}</td>
                <td>{reserva.dropOff}</td>
                <td>{reserva.AD}</td>
                <td>{reserva.NI}</td>
                <td>{reserva.precio}</td>
                <td>{reserva.nota}</td>
                <td>
                  <button onClick={() => handleDelete(reserva.id)}>
                    ❌ Eliminar
                  </button>
                  <button
                    onClick={() =>
                      (window.location.href = `/reservas/edit/${reserva.id}`)
                    }
                  >
                    ✏️ Editar
                  </button>
                </td>
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
      <button
        onClick={logout}
        className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg flex items-center hover:bg-red-600"
        onMouseUp={user?.email}
      >
        Cerrar Sesión
      </button>
    </div>
  );
}
