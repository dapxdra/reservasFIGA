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
import Loading from "../components/common/Loading.jsx";
import { useReservasData } from "../context/ReservasDataContext.js";
import { notifySuccess, notifyError, confirmToast } from "../utils/notify.js";
import toast from "react-hot-toast";

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
  const { reservas, filteredReservas, isLoading, setReservas } = useReservas(
    filtro,
    searchQuery,
    filters
  );
  const { invalidateCache, removesReservaFromCache } = useReservasData();
  const [revisadas, setRevisadas] = useState({}); // useReservasRevisadas();
  const [currentPage, setCurrentPage] = useState(1);
  const reservasPorPagina = 8;
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
        notifyError("Tu sesión ha expirado por inactividad.");
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

  const verCanceladas = filtro === "canceladas";

  const toggleCanceladas = () => {
    setFiltro((prev) => (prev === "canceladas" ? "activas" : "canceladas"));
  };

  const toggleAntiguas = () => {
    setFiltro((prevFiltro) =>
      prevFiltro === "antiguas" ? "activas" : "antiguas"
    );
  };

  const toggleFuturas = () => {
    setFiltro((prevFiltro) =>
      prevFiltro === "futuras" ? "activas" : "futuras"
    );
  };

  const handleFormatDate = (fecha) => formatDate(fecha);
  const handleFormatearHora = (hora) => formatearHora(hora);

  const handleCancelar = async (id) => {
    const confirm = await confirmToast(
      "¿Estás seguro de que deseas cancelar esta reserva?",
      { okText: "Sí, cancelar", cancelText: "No" }
    );
    if (!confirm) return;
    await toast.promise(cancelarReserva(id), {
      loading: "Cancelando reserva...",
      success: "Reserva cancelada con éxito",
      error: "Error al cancelar la reserva",
    });
    // actualización optimista
    setReservas((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              cancelada: true,
              canceledAt: r.canceledAt || new Date().toISOString(),
            }
          : r
      )
    );
    // si estabas viendo activas, se ocultará sola en filteredReservas
    setFiltro("activas");
  };

  const handlePageChange = useCallback((newPage) => {
    setCurrentPage(newPage);
  }, []);

  const exportToExcel = (data, fileName) => {
    try {
      toast.loading("Generando archivo Excel...", { id: "export" });

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
        CanceledAt: r.canceledAt
          ? new Date(r.canceledAt).toISOString().split("T")[0]
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

      toast.success("Archivo Excel generado con éxito", { id: "export" });
    } catch (error) {
      console.error("Error al exportar a Excel:", error);
      toast.error("Error al generar el archivo Excel", { id: "export" });
    }
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
  if (isLoading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="w-full min-h-screen bg-white flex flex-col items-center">
        <nav className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 shadow-sm rounded-xl px-4 py-3 mb-6">
          <div className="flex items-center gap-4">
            <input
              type="text"
              title="Buscar por ID, ItinId, Cliente o Agencia"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="input-search border border-gray-300 rounded-md px-3 py-2 text-black min-w-[160px] max-w-[220px] focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              onClick={() => setShowModal(true)}
              className="filter-button text-black px-3 py-2 rounded-md  hover:bg-blue-100 border border-blue-200"
              title="Filtros Avanzados"
            >
              Filtros
            </button>

            {showModal && (
              <Suspense fallback={<div>Cargando...</div>}>
                <Modal
                  onClose={() => setShowModal(false)}
                  className="text-black"
                >
                  <h2 className="text-lg font-bold mb-2 col-span-8 ">
                    Filtros Avanzados
                  </h2>
                  <label className="col-span-1">Fecha Inicio:</label>
                  <input
                    type="date"
                    value={filters.startDate}
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
                    value={filters.endDate}
                    onChange={(e) =>
                      setFilters({ ...filters, endDate: e.target.value })
                    }
                    className="p-2 border w-full mb-2 datepicker col-span-3"
                  />
                  <label className="col-span-1">Mes:</label>
                  <select
                    value={filters.month}
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
                    value={filters.cliente}
                    onChange={(e) =>
                      setFilters({ ...filters, cliente: e.target.value })
                    }
                    className="p-2 border w-full mb-2 col-span-6"
                  />
                  <label className="col-span-2">Agencia:</label>
                  <input
                    type="text"
                    value={filters.proveedor}
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
                    value={filters.itinId}
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
          </div>
          <div
            className="flex-none items-center ml-px-4 cursor-pointer"
            role="button"
            title="Ir al dashboard (ver activas)"
            onClick={() => {
              setFiltro("activas");
              setSearchQuery("");
              setFilters({
                startDate: "",
                endDate: "",
                month: "",
                cliente: "",
                id: "",
                itinId: "",
                proveedor: "",
              });
              invalidateCache();
              router.push("/dashboard");
            }}
          >
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            {/* Espacio para el botón de Reportes */}
            <button
              onClick={() => router.push("/reportes")}
              className="button-reports px-3 py-2 rounded-md hover:bg-blue-100 border border-blue-200"
              title="Ver Reportes"
            >
              Reportes
            </button>
            {/* Espacio para el botón de exportar */}
            <button
              onClick={() =>
                exportToExcel(
                  filteredReservas,
                  `Reservas_FIGA_${new Date().toISOString().split("T")[0]}`
                )
              }
              //className="border rounded-md text-black button-export"
              className="button-export px-3 py-2 rounded-md hover:bg-yellow-100 border"
              title="Exportar"
            >
              Exportar
            </button>
            {/* Botón de Crear Reserva */}
            <button
              onClick={handleNavigate}
              title="Crear Reserva"
              //className="border rounded-md text-black button-create"
              className="button-create px-3 py-2 rounded-md hover:bg-green-100 border border-green-200"
            ></button>
            <button
              onClick={toggleCanceladas}
              className={`button-canceladas px-3 py-2 rounded-md hover:bg-green-100 border ${
                verCanceladas ? "button-activo icon-activas" : "icon-canceladas"
              }`}
              aria-label={verCanceladas ? "Ver Activas" : "Ver Canceladas"}
              title={verCanceladas ? "Ver Activas" : "Ver Canceladas"}
            ></button>
            <button
              onClick={toggleAntiguas}
              className={`button-antiguas px-3 py-2 rounded-md hover:bg-green-100 border ${
                filtro === "antiguas"
                  ? "button-activo icon-activas"
                  : "icon-antiguas"
              }`}
              title={filtro === "antiguas" ? "Ver Activas" : "Ver Antiguas"}
            ></button>
            <button
              onClick={toggleFuturas}
              className={`button-futuras px-3 py-2 rounded-md hover:bg-green-100 border ${
                filtro === "futuras"
                  ? "button-activo icon-activas"
                  : "icon-futuras"
              }`}
              title={filtro === "futuras" ? "Ver Activas" : "Ver Futuras"}
            ></button>
            <button
              onClick={logout}
              title="Cerrar Sesión"
              className="button-logout px-3 py-2 rounded-md hover:bg-red-300 border"
            ></button>
          </div>
        </nav>
        <div className="w-full shadow-sm rounded border>">
          <table className="dashboard-table min-w-full table-auto text-sm rounded border shadow-sm">
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
                  <td colSpan={17} className="text-center py-4 text-gray-500">
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
                    <td className="max-w-xs overflow-x-auto">{reserva.nota}</td>
                    <td>{reserva.chofer}</td>
                    <td>{reserva.buseta}</td>
                    <td>{reserva.precio}</td>
                    <td>{reserva.pago ? "Sí" : "No"}</td>
                    <td>{reserva.fechaPago}</td>
                    <td className="actions">
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
                    ? "bg-gray-300 text-black opacity-75"
                    : "bg-gray-100 hover:bg-gray-200 opacity-50"
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
    </div>
  );
}
