"use client";

import { useEffect, useState } from "react";
import { auth } from "../lib/firebase.js";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import Image from "next/image";
import { set } from "react-hook-form";
import "../styles/dashboard.css";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [filteredReservas, setFilteredReservas] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDateSearch, setIsDateSearch] = useState(false);
  const [verCanceladas, setVerCanceladas] = useState(false);
  const [canceladas, setCanceladas] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login"); // Redirigir si no está autenticado
      } else {
        setUser(user);
      }
    });
    const fetchReservas = async () => {
      try {
        const response = await fetch("/api/reservas");
        const data = await response.json();
        console.log("Datos de reservas obtenidos:", data);
        setReservas(data);
        setFilteredReservas(data);
      } catch (error) {
        console.error("Error al obtener reservas:", error);
      }
    };

    fetchReservas();

    return () => unsubscribe();
  }, [router]);

  const fetchCanceladas = async () => {
    try {
      const response = await fetch("/api/canceladas");
      const data = await response.json();
      setCanceladas(data);
    } catch (error) {
      console.error("Error al obtener reservas canceladas:", error);
    }
  };

  const toggleCanceladas = () => {
    fetchCanceladas();
    if (!verCanceladas) fetchCanceladas();
    setVerCanceladas(!verCanceladas);
  };

  const handleFilter = () => {
    console.log("Búsqueda:", searchQuery);

    let filtered = [...reservas];

    if (searchQuery) {
      filtered = filtered.filter((reserva) => {
        return (
          reserva.fecha.includes(searchQuery) || // Coincidencia parcial en fecha
          reserva.itinId.toString() === searchQuery || // Coincidencia exacta en itinId
          reserva.cliente.includes(searchQuery) || // Coincidencia parcial en cliente
          reserva.proveedor.includes(searchQuery) // Coincidencia parcial en proveedor
        );
      });
    }

    console.log("Resultados filtrados:", filtered);
    setFilteredReservas(filtered);
  };

  // Función para cambiar el tipo de input según el valor ingresado
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Si el usuario ingresa algo con formato de fecha (AAAA-MM-DD), cambia a tipo 'date'
    setIsDateSearch(/^\d{4}-\d{2}-\d{2}$/.test(value));
  };

  const handleNavigate = () => {
    router.push("/reservas");
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Estás seguro de cancelar esta reserva?")) return;
    await fetch(`/api/reservas/${id}`, { method: "DELETE" }); // Eliminar la reserva

    setReservas(reservas.filter((reserva) => reserva.id !== id)); // Actualizar la lista de reservas
  };

  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      {/* Tabla */}
      {!reservas.length ? (
        <p>loading...</p>
      ) : (
        reservas.length > 0 && (
          <>
            <div className="dashboard-container">
              <input
                type={isDateSearch ? "date" : "text"}
                placeholder={
                  isDateSearch ? "Selecciona una fecha" : "Buscar..."
                }
                value={searchQuery}
                onChange={handleInputChange}
                className="border rounded-md text-black input-search"
              />
              <button onClick={handleFilter} className="search-button">
                .
              </button>
              {/* Botón de Crear Reserva */}
              <button
                onClick={handleNavigate}
                className="border rounded-md text-black button-create"
              >
                <span className="mr-2">📁</span>
              </button>
              <button
                onClick={toggleCanceladas}
                className="border rounded-md text-black button-canceladas"
              >
                {verCanceladas ? "VA" : "VC"}
              </button>
              <button
                onClick={toggleCanceladas}
                className="border rounded-md text-black button-antiguas"
              >
                {verCanceladas ? "VA" : "VAN"}
              </button>
              <button
                onClick={logout}
                className="border rounded-md text-black button-logout"
              >
                Cerrar Sesión
              </button>

              <table className="dashboard-table">
                <Image
                  src="/logo.png"
                  alt="FIGA Logo"
                  width={280}
                  height={280}
                  className="dashboard-logo"
                />
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
                    <th>Pago</th>
                    <th>FechaPago</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(verCanceladas ? canceladas : filteredReservas).map(
                    (reserva) => (
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
                        <td className="scroll">{reserva.nota}</td>
                        <td>{reserva.pago ? "Sí" : "No"}</td>
                        <td>{reserva.fechaPago}</td>
                        <td>
                          <button onClick={() => handleDelete(reserva.id)}>
                            ❌ Cancelar
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
                    )
                  )}
                </tbody>
              </table>
            </div>
          </>
        )
      )}
    </div>
  );
}
