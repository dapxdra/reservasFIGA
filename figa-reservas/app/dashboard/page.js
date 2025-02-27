"use client";

import { useEffect, useState } from "react";
import { auth } from "../lib/firebase.js";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import Image from "next/image";
import { set } from "react-hook-form";
import "../styles/dashboard.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [filteredReservas, setFilteredReservas] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDateSearch, setIsDateSearch] = useState(false);
  const [verCanceladas, setVerCanceladas] = useState(false);
  const [filtro, setFiltro] = useState("activas");

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
        const response = await fetch(`/api/reservas?filter=${filtro}`);
        const data = await response.json();
        console.log("Datos de reservas obtenidos:", data);
        setReservas(data);

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const activas = data.filter(
          (reserva) => !reserva.cancelada && new Date(reserva.fecha) >= hoy
        );
        setFilteredReservas(activas);
      } catch (error) {
        console.error("Error al obtener reservas:", error);
      }
    };

    fetchReservas();
    filtrarReservas(filtro);

    return () => unsubscribe();
  }, [filtro, router]);

  const toggleCanceladas = () => {
    setVerCanceladas(!verCanceladas);
    if (!verCanceladas) {
      // Mostrar solo las canceladas
      const canceladas = reservas.filter((reserva) => reserva.cancelada);
      setFilteredReservas(canceladas);
    } else {
      // Volver a mostrar las activas
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const activas = reservas.filter(
        (reserva) => !reserva.cancelada && new Date(reserva.fecha) >= hoy
      );
      setFilteredReservas(activas);
    }
  };

  const toggleAntiguas = () => {
    setFiltro((prevFiltro) =>
      prevFiltro === "activas" ? "antiguas" : "activas"
    );
  };

  const filtrarReservas = async (filtro) => {
    try {
      const res = await fetch("/api/reservas");
      const data = await res.json();

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const filtradas = data.filter((reserva) => {
        const fechaReserva = new Date(reserva.fecha); // Asegúrate de que 'fecha' esté correctamente formateada
        if (filtro === "activas") {
          return !reserva.cancelada && fechaReserva >= hoy; // Reservas activas desde hoy en adelante
        } else {
          return !reserva.cancelada && fechaReserva < hoy; // Solo las antiguas (completadas)
        }
      });

      setFilteredReservas(filtradas);
    } catch (error) {
      console.error("Error al filtrar reservas:", error);
    }
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

  const handleCancel = async (id) => {
    if (!confirm("¿Estás seguro de cancelar esta reserva?")) return;

    try {
      const res = await fetch(`/api/reservas/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, cancelada: true }),
      });

      if (!res.ok) {
        throw new Error("Error al cancelar la reserva");
      }

      // Actualizar la lista de reservas sin eliminar, solo ocultar las canceladas
      setReservas((prevReservas) =>
        prevReservas.map((reserva) =>
          reserva.id === id ? { ...reserva, cancelada: true } : reserva
        )
      );
    } catch (error) {
      console.error("Error al cancelar la reserva:", error);
    }
  };

  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const exportToExcel = (data, fileName) => {
    const workSheet = XLSX.utils.json_to_sheet(data);
    const workBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workBook, workSheet, "Reservas");
    const excelBuffer = XLSX.write(workBook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob(
      { excelBuffer },
      { type: "application/octet-stream" }
    );
    saveAs(blob, `${fileName}.xlsx`);
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
                title="Buscar por Fecha, ItinId, Cliente o Proveedor"
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
              <button
                onClick={() => exportToExcel(reservas, "Resrevas_FIGA")}
                className="border rounded-md text-black button-export"
                title="Exportar a Excel"
              >
                .
              </button>
              {/* Botón de Crear Reserva */}
              <button
                onClick={handleNavigate}
                title="Crear Reserva"
                className="border rounded-md text-black button-create"
              >
                .
              </button>
              <button
                onClick={toggleCanceladas}
                className={`border rounded-md text-black button-canceladas ${
                  verCanceladas ? "icon-activas" : "icon-canceladas"
                }`}
                aria-label={verCanceladas ? "Ver Activas" : "Ver Canceladas"}
                title={verCanceladas ? "Ver Activas" : "Ver Canceladas"}
              >
                .
              </button>
              <button
                onClick={toggleAntiguas}
                className={`border rounded-md text-black button-canceladas ${
                  filtro === "activas" ? "icon-antiguas" : "icon-activas"
                }`}
                title={filtro === "activas" ? "Ver Antiguas" : "Ver Activas"}
              >
                .
              </button>
              <button
                onClick={logout}
                title="Cerrar Sesión"
                className="border rounded-md text-black button-logout"
              >
                .
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
                  {filteredReservas.map((reserva) => (
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
                        <button
                          onClick={() => handleCancel(reserva.id)}
                          className="actionbutton-cancel"
                          title="Cancelar Reserva"
                        >
                          .
                        </button>
                        <button
                          onClick={() =>
                            (window.location.href = `/reservas/edit/${reserva.id}`)
                          }
                          className="actionbutton-edit"
                          title="Editar Reserva"
                        >
                          .
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      )}
    </div>
  );
}
