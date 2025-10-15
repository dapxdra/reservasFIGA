"use client";

import {
  useEffect,
  useState,
  useRef,
  Suspense,
  lazy,
  useCallback,
  useMemo,
} from "react";
import { auth } from "../lib/firebase.jsx";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import "../styles/dashboard.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useReservas } from "../hooks/useReservas";
import { formatDate } from "../utils/formatDate";
import { formatearHora } from "../utils/formatearHora";
import { cancelarReserva } from "../lib/api.js";
import Logo from "../components/common/Logo.jsx";
import { useReservasRevisadas } from "../context/ReservasContext";

const Modal = lazy(() => import("../components/common/modal"));

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [filtro, setFiltro] = useState("activas");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    month: "",
    cliente: "",
    id: "",
    itinId: "",
    proveedor: "",
  });
  const { reservas, filteredReservas } = useReservas(
    filtro,
    searchQuery,
    filters
  );
  const [revisadas, setRevisadas] = useState({}); // useReservasRevisadas();
  const [currentPage, setCurrentPage] = useState(1);
  const reservasPorPagina = 8;
  const [verCanceladas, setVerCanceladas] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const logoutTimer = useRef(null);
  const INACTIVITY_LIMIT = 10 * 60 * 1000;

  // --- useEffect de autenticación y recuperación de filtros ---
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
      }
    });

    if (typeof window !== "undefined") {
      const storedFiltro = localStorage.getItem("dashboardFiltro");
      const storedSearchQuery = localStorage.getItem("dashboardSearchQuery");
      const storedFilters = localStorage.getItem("dashboardFilters");
      if (storedFiltro) setFiltro(storedFiltro);
      if (storedSearchQuery) setSearchQuery(storedSearchQuery);
      if (storedFilters) setFilters(JSON.parse(storedFilters));
      const storedRevisadas = localStorage.getItem("reservasRevisadas");
      if (storedRevisadas) setRevisadas(JSON.parse(storedRevisadas));
    }

    return () => unsubscribe();
  }, [router]);

  // --- useEffect de inactividad ---
  useEffect(() => {
    const resetTimer = () => {
      clearTimeout(logoutTimer.current);
      logoutTimer.current = setTimeout(async () => {
        alert("Tu sesión ha expirado por inactividad.");
        await logout();
      }, INACTIVITY_LIMIT);
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);
    window.addEventListener("scroll", resetTimer);
    resetTimer();

    return () => {
      clearTimeout(logoutTimer.current);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("scroll", resetTimer);
    };
  }, []);

  // --- Funciones auxiliares ---
  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const handleNavigate = () => {
    router.push("/reservas");
  };

  const toggleRevisada = (id) => {
    const updated = { ...revisadas, [id]: !revisadas[id] };
    setRevisadas(updated);
    localStorage.setItem("reservasRevisadas", JSON.stringify(updated));
  };

  const toggleCanceladas = () => {
    setVerCanceladas((prev) => !prev);
    setFiltro((prev) => (prev === "canceladas" ? "activas" : "canceladas"));
  };
  const toggleAntiguas = () => {
    setFiltro((prevFiltro) =>
      prevFiltro === "activas" ? "antiguas" : "activas"
    );
  };
  const toggleFuturas = () => {
    setFiltro((prevFiltro) =>
      prevFiltro === "activas" ? "futuras" : "activas"
    );
  };

  const handleFormatDate = (fecha) => formatDate(fecha);
  const handleFormatearHora = (hora) => formatearHora(hora);

  const handleCancelar = async (id) => {
    const confirm = window.confirm(
      "¿Estás seguro de que deseas cancelar esta reserva?"
    );
    if (!confirm) return;
    await cancelarReserva(id);
    setFiltro("activas");
  };

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
  }, []);

  const exportToExcel = (data, fileName) => {
    const dataForExcel = data.map((r) => ({
      ID: r.id,
      Fecha: r.fecha ? new Date(r.fecha).toISOString().split("T")[0] : "",
      Agencia: r.proveedor,
      ItinId: r.itinId,
      PickUp: r.pickUp,
      DropOff: r.dropOff,
      Hora: r.hora,
      Adultos: r.AD,
      Niños: r.NI,
      Cliente: r.cliente,
      Nota: r.nota,
      Chofer: r.chofer,
      Buseta: r.buseta,
      Precio: r.precio,
      Pago: r.pago ? "Sí" : "No",
      FechaPago: r.fechaPago
        ? new Date(r.fechaPago).toISOString().split("T")[0]
        : "",
      Cancelada: r.cancelada ? "Sí" : "No",
      CreatedAt: r.createdAt
        ? new Date(r.createdAt).toISOString().split("T")[0]
        : "",
    }));
    const workSheet = XLSX.utils.json_to_sheet(dataForExcel);
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

  // --- Paginación ---
  const totalPages = Math.ceil(filteredReservas.length / reservasPorPagina);
  const indexOfLast = currentPage * reservasPorPagina;
  const indexOfFirst = indexOfLast - reservasPorPagina;
  const reservasPaginadas = useMemo(
    () => filteredReservas.slice(indexOfFirst, indexOfLast),
    [filteredReservas, indexOfFirst, indexOfLast]
  );

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-white p-4">
      {/* Tabla */}
      {!reservas.length ? (
        <p>loading...</p>
      ) : (
        reservas.length > 0 && (
          <>
            <div className="dashboard-container flex flex-col gap-4">
              <div className="dashbar flex flex-wrap gap-2 justify-between items-center">
                <input
                  type="text"
                  title="Buscar por ID, ItinId, Cliente o Agencia"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border rounded-md text-black input-search"
                />
                {/* <button
                  onClick={handleFilter}
                  className="search-button"
                  title="Buscar por ID, ItinId, Cliente o Agencia"
                ></button> */}
                <button
                  onClick={() => setShowModal(true)}
                  className="filter-button"
                  title="Filtros Avanzados"
                ></button>

                {showModal && (
                  <Suspense fallback={<div>Cargando...</div>}>
                    <Modal onClose={() => setShowModal(false)}>
                      <h2 className="text-lg font-bold mb-2 col-span-8 ">
                        Filtros Avanzados
                      </h2>
                      <label className="col-span-1">Fecha Inicio:</label>
                      <input
                        type="date"
                        value={filters.startDate || ""}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            startDate: e.target.value,
                          })
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
                      <label className="col-span-2">Agencia:</label>
                      <input
                        type="text"
                        value={filters.proveedor || ""}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            proveedor: e.target.value,
                          })
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
                        onClick={() => setShowModal(false)}
                        className="applyFilters-button col-span-8"
                        title="Aplicar Filtros"
                      ></button>
                    </Modal>
                  </Suspense>
                )}
                <Logo />
                <button
                  onClick={() =>
                    exportToExcel(
                      filteredReservas,
                      `Reservas_FIGA_${new Date().toISOString().split("T")[0]}`
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
                    verCanceladas
                      ? "button-activo icon-activas"
                      : "icon-canceladas"
                  }`}
                  aria-label={verCanceladas ? "Ver Activas" : "Ver Canceladas"}
                  title={verCanceladas ? "Ver Activas" : "Ver Canceladas"}
                ></button>
                <button
                  onClick={toggleAntiguas}
                  className={`border rounded-md text-black button-antiguas ${
                    filtro === "activas"
                      ? "icon-antiguas"
                      : "button-activo icon-activas"
                  }`}
                  title={filtro === "activas" ? "Ver Antiguas" : "Ver Activas"}
                ></button>
                <button
                  onClick={toggleFuturas}
                  className={`border rounded-md text-black button-futuras ${
                    filtro === "activas"
                      ? "icon-futuras"
                      : "button-activo icon-activas"
                  }`}
                  title={filtro === "activas" ? "Ver Futuras" : "Ver Activas"}
                ></button>
                <button
                  onClick={logout}
                  title="Cerrar Sesión"
                  className="border rounded-md text-black button-logout"
                ></button>
              </div>
              <div className="overflow-auto max-h-[70vh] rounded border>">
                <table className="dashboard-table min-w-full table-auto text-sm">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fecha</th>
                      <th>Agencia</th>
                      <th>ItinId</th>
                      <th>PickUp</th>
                      <th>DropOff</th>
                      <th>Hora</th>
                      <th>Adultos</th>
                      <th>Niños</th>
                      <th>Cliente</th>
                      <th>Nota</th>
                      <th>Chofer</th>
                      <th>Buseta</th>
                      <th>Precio</th>
                      <th>Pago</th>
                      <th>FechaPago</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReservas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={15}
                          className="text-center py-4 text-gray-500"
                        >
                          No se encontraron reservas con los filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      reservasPaginadas.map((reserva) => (
                        <tr key={reserva.id} className="border-t">
                          <td>{reserva.id}</td>
                          <td>{handleFormatDate(reserva.fecha)}</td>
                          <td>{reserva.proveedor}</td>
                          <td>{reserva.itinId}</td>
                          <td>{reserva.pickUp}</td>
                          <td>{reserva.dropOff}</td>
                          <td>{handleFormatearHora(reserva.hora)}</td>
                          <td>{reserva.AD}</td>
                          <td>{reserva.NI}</td>
                          <td>{reserva.cliente}</td>
                          <td className="max-w-xs overflow-x-auto">
                            {reserva.nota}
                          </td>
                          <td>{reserva.chofer}</td>
                          <td>{reserva.buseta}</td>
                          <td>{reserva.precio}</td>
                          <td>{reserva.pago ? "Sí" : "No"}</td>
                          <td>{reserva.fechaPago}</td>
                          <td>
                            <button
                              onClick={() => handleCancelar(reserva.id)}
                              className="actionbutton-cancel"
                              title="Cancelar Reserva"
                            ></button>
                            <button
                              onClick={() => {
                                localStorage.setItem("dashboardFiltro", filtro);
                                localStorage.setItem(
                                  "dashboardSearchQuery",
                                  searchQuery
                                );
                                localStorage.setItem(
                                  "dashboardFilters",
                                  JSON.stringify(filters)
                                );

                                router.push(`/reservas/edit/${reserva.id}`);
                              }}
                              className="actionbutton-edit"
                              title="Editar Reserva"
                            ></button>
                            <input
                              type="checkbox"
                              checked={revisadas[reserva.id] || false}
                              onChange={() => toggleRevisada(reserva.id)}
                              className="actionbutton-check"
                              title="Marcar como revisada"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Paginación */}
              <div className="table-pagination flex justify-center items-center gap-2 flex-wrap mt-4">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="disabled:opacity-50"
                >
                  Ant
                </button>

                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-1 py-1 rounded ${
                        currentPage === page
                          ? "bg-gray-200 text-black opacity-25"
                          : "bg-gray-100 hover:bg-gray-300 opacity-25"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="disabled:opacity-50"
                >
                  Sig
                </button>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
