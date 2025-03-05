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
import Modal from "../components/modal.js";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [filteredReservas, setFilteredReservas] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDateSearch, setIsDateSearch] = useState(false);
  const [verCanceladas, setVerCanceladas] = useState(false);
  const [filtro, setFiltro] = useState("activas");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    month: "",
    cliente: "",
    id: "",
    itinId: "",
    proveedor: "",
  });

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

  const toggleAdvancedFilters = () => {
    setShowAdvancedFilters(!showAdvancedFilters);
  };

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

  const handleSearch = () => {
    let filtered = reservas.filter((r) => !r.cancelada);
    if (searchQuery) {
      filtered = reservas.filter((r) =>
        [r.fecha, r.itinId, r.cliente, r.proveedor, r.id]
          .map((v) => v.toString().toLowerCase)
          .some((value) => value.includes(searchQuery.toLowerCase()))
      );
    }

    //Aplica filtros avanzados
    if (filters.startDate && filters.endDate) {
      filtered = filtered.filter(
        (r) =>
          new Date(r.fecha) >= new Date(filters.startDate) &&
          new Date(r.fecha) <= new Date(filters.endDate)
      );
    }
    if (filters.month) {
      filtered = filtered.filter((r) => {
        const reservaMonth = new Date(r.fecha).getMonth() + 1; // getMonth() es 0-indexed
        return reservaMonth === parseInt(filters.month);
      });
    }
    if (filters.cliente) {
      filtered = filtered.filter((r) =>
        r.cliente.toLowerCase().includes(filters.cliente.toLowerCase())
      );
    }
    if (filters.proveedor) {
      filtered = filtered.filter((r) =>
        r.proveedor.toLowerCase().includes(filters.proveedor.toLowerCase())
      );
    }
    if (filters.itinId) {
      filtered = filtered.filter((r) => r.itinId.toString() === filters.itinId);
    }
    if (filters.id) {
      filtered = filtered.filter((r) => r.id.toString() === filters.id);
    }
    setFilteredReservas(filtered);
    setShowModal(false);
  };

  const handleAdvancedFilter = () => {
    let filtered = [...reservas];

    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      filtered = filtered.filter((reserva) => {
        const fechaReserva = new Date(reserva.fecha);
        return fechaReserva >= startDate && fechaReserva <= endDate;
      });
    }

    if (filters.month) {
      filtered = filtered.filter((reserva) => {
        const reservaMonth = new Date(reserva.fecha).getMonth() + 1; // getMonth() es 0-indexed
        return reservaMonth === parseInt(filters.month);
      });
    }

    if (filters.cliente) {
      filtered = filtered.filter((reserva) =>
        reserva.cliente.toLowerCase().includes(filters.cliente.toLowerCase())
      );
    }

    if (filters.id) {
      filtered = filtered.filter(
        (reserva) => reserva.id.toString() === filters.id
      );
    }

    if (filters.itinId) {
      filtered = filtered.filter(
        (reserva) => reserva.itinId.toString() === filters.itinId
      );
    }

    setFilteredReservas(filtered);
  };

  const handleFilter = () => {
    const { startDate, endDate } = filters;

    // Validar si las fechas están completas
    if (startDate && endDate && startDate > endDate) {
      alert("La fecha de inicio no puede ser posterior a la fecha de fin");
      return;
    }
    console.log("Búsqueda:", searchQuery);
    console.log("Aplicando filtros:", filters);

    let filtered = [...reservas];

    if (searchQuery) {
      filtered = filtered.filter((reserva) => {
        return (
          reserva.fecha.includes(searchQuery) ||
          reserva.itinId.toString().includes(searchQuery) ||
          reserva.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
          reserva.proveedor.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }

    console.log("Resultados filtrados:", filtered);
    setFilteredReservas(filtered.filter((reserva) => !reserva.cancelada));
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
      type: "binary",
    });
    const blob = new Blob([s2ab(excelBuffer)], {
      type: "application/octet-stream",
    });
    saveAs(blob, `${fileName}.xlsx`);
  };

  const s2ab = (s) => {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) {
      view[i] = s.charCodeAt(i) & 0xff;
    }
    return buf;
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
              <div className="dashbar">
                <input
                  type="text"
                  title="Buscar por Fecha, ItinId, Cliente o Proveedor"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border rounded-md text-black input-search"
                />
                <button
                  onClick={handleFilter}
                  className="search-button"
                  title="Buscar por Fecha, ItinId, Cliente o Proveedor"
                ></button>
                <button
                  onClick={() => setShowModal(true)}
                  className="filter-button"
                  title="Filtros Avanzados"
                ></button>

                {showModal && (
                  <Modal onClose={() => setShowModal(false)}>
                    <h2 className="text-lg font-bold mb-2 col-span-8 ">
                      Filtros Avanzados
                    </h2>
                    <label className="col-span-1">Fecha Inicio:</label>
                    <input
                      type="date"
                      value={filters.startDate || ""}
                      onChange={(e) =>
                        setFilters({ ...filters, startDate: e.target.value })
                      }
                      className="p-2 border w-full mb-2 datepicker col-span-3"
                    />
                    <label className="col-span-1">Fecha Fin:</label>
                    <input
                      type="date"
                      value={filters.endDate || ""}
                      onChange={(e) =>
                        setFilters({ ...filters, endDate: e.target.value })
                      }
                      className="p-2 border w-full mb-2 datepicker col-span-3"
                    />
                    <label className="col-span-1">Mes:</label>
                    <select
                      value={filters.month || ""}
                      onChange={(e) =>
                        setFilters({ ...filters, month: e.target.value })
                      }
                      className="p-2 border w-full mb-2 col-span-7"
                    >
                      <option value="">Selecciona un mes</option>
                      <option value="01">Enero</option>
                      <option value="02">Febrero</option>
                      <option value="03">Marzo</option>
                      <option value="04">Abril</option>
                      <option value="05">Mayo</option>
                      <option value="06">Junio</option>
                      <option value="07">Julio</option>
                      <option value="08">Agosto</option>
                      <option value="09">Septiembre</option>
                      <option value="10">Octubre</option>
                      <option value="11">Noviembre</option>
                      <option value="12">Diciembre</option>
                    </select>
                    <label className="col-span-2">Cliente:</label>
                    <input
                      type="text"
                      value={filters.cliente || ""}
                      onChange={(e) =>
                        setFilters({ ...filters, cliente: e.target.value })
                      }
                      className="p-2 border w-full mb-2 col-span-6"
                    />
                    <label className="col-span-2">Proveedor:</label>
                    <input
                      type="text"
                      value={filters.proveedor || ""}
                      onChange={(e) =>
                        setFilters({ ...filters, proveedor: e.target.value })
                      }
                      className="p-2 border w-full mb-2 col-span-6"
                    />
                    <label className="col-span-1">ItinId:</label>
                    <input
                      type="text"
                      value={filters.itinId || ""}
                      onChange={(e) =>
                        setFilters({ ...filters, itinId: e.target.value })
                      }
                      className="p-2 border w-full mb-2 col-span-3"
                    />

                    <label className="col-span-1">ID:</label>
                    <input
                      type="text"
                      value={filters.id}
                      onChange={(e) =>
                        setFilters({ ...filters, id: e.target.value })
                      }
                      className="p-2 border w-full mb-2 col-span-3"
                    />

                    <button
                      onClick={handleSearch}
                      className="applyFilters-button col-span-8"
                      title="Aplicar Filtros"
                    ></button>
                  </Modal>
                )}
                <button
                  onClick={() =>
                    exportToExcel(
                      filteredReservas,
                      `Reservas_FIGA_${new Date().toLocaleDateString()}`
                    )
                  }
                  className="border rounded-md text-black button-export"
                  title="Exportar a Excel"
                ></button>
                {/* Botón de Crear Reserva */}
                <button
                  onClick={handleNavigate}
                  title="Crear Reserva"
                  className="border rounded-md text-black button-create"
                ></button>
                <button
                  onClick={toggleCanceladas}
                  className={`border rounded-md text-black button-canceladas ${
                    verCanceladas ? "icon-activas" : "icon-canceladas"
                  }`}
                  aria-label={verCanceladas ? "Ver Activas" : "Ver Canceladas"}
                  title={verCanceladas ? "Ver Activas" : "Ver Canceladas"}
                ></button>
                <button
                  onClick={toggleAntiguas}
                  className={`border rounded-md text-black button-canceladas ${
                    filtro === "activas" ? "icon-antiguas" : "icon-activas"
                  }`}
                  title={filtro === "activas" ? "Ver Antiguas" : "Ver Activas"}
                ></button>
                <button
                  onClick={logout}
                  title="Cerrar Sesión"
                  className="border rounded-md text-black button-logout"
                ></button>
              </div>

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
                        ></button>
                        <button
                          onClick={() =>
                            (window.location.href = `/reservas/edit/${reserva.id}`)
                          }
                          className="actionbutton-edit"
                          title="Editar Reserva"
                        ></button>
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
