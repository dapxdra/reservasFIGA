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
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useReservas } from "../hooks/useReservas";
import { cancelarReserva } from "../lib/api.js";
import Logo from "../components/common/Logo.jsx";
import DashboardIcon from "../components/common/DashboardIcon.jsx";
import Loading from "../components/common/Loading.jsx";
import { useReservasData } from "../context/ReservasDataContext.js";
import { useUser } from "../context/UserContext.js";
import { notifyError, confirmToast } from "../utils/notify.js";
import toast from "react-hot-toast";

const Modal = lazy(() => import("../components/common/modal"));
const ReservationMapLeaflet = lazy(() => import("../components/common/ReservationMapLeaflet.jsx"));

const reservasPorPagina = 8;
const INACTIVITY_LIMIT = 10 * 60 * 1000;
const EMPTY_FILTERS = {
  startDate: "",
  endDate: "",
  month: "",
  cliente: "",
  id: "",
  itinId: "",
  proveedor: "",
};

function formatDashboardDate(value) {
  if (!value) return "-";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatExcelDate(value) {
  if (!value) return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function formatPrice(value) {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(numericValue);
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function formatDashboardTime(value) {
  if (!value) return "-";

  const rawValue = String(value).trim();

  const match24h = rawValue.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (match24h) {
    const hour24 = Number(match24h[1]);
    const minutes = match24h[2];
    const period = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${minutes} ${period}`;
  }

  const match12h = rawValue.match(/^([1-9]|1[0-2]):([0-5]\d)\s*([AaPp][Mm])$/);
  if (match12h) {
    const hours = match12h[1];
    const minutes = match12h[2];
    const period = match12h[3].toUpperCase();
    return `${hours}:${minutes} ${period}`;
  }

  return rawValue;
}

function getAgencyInitials(proveedor) {
  if (!proveedor) return "--";
  const words = proveedor.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

function getAgencyTheme(proveedor) {
  const normalized = (proveedor || "").toLowerCase();

  if (normalized.includes("expedia")) return "agency-blue";
  if (normalized.includes("booking")) return "agency-orange";
  if (normalized.includes("direct")) return "agency-purple";
  if (normalized.includes("despegar")) return "agency-emerald";

  return "agency-slate";
}

function getPaginationSummary(total, currentPage, perPage) {
  if (total === 0) return "Mostrando 0 a 0 de 0 resultados";
  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);
  return `Mostrando ${start} a ${end} de ${total} resultados`;
}

function buildGoogleDirectionsUrl(origin, destination) {
  const originText = String(origin || "").trim();
  const destinationText = String(destination || "").trim();
  if (!originText || !destinationText) return "";

  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originText)}&destination=${encodeURIComponent(destinationText)}&travelmode=driving`;
}

function ReservationTableRow({
  reserva,
  revisada,
  onOpenMap,
  onToggleRevisada,
  onEdit,
  onCancel,
  canManage,
  showPrice,
  showPayment,
  showVehiculo,
}) {
  const paid = Boolean(reserva.pago);
  const agencyTheme = getAgencyTheme(reserva.proveedor);
  const conductor = reserva.conductorNombre || reserva.chofer || "-";
  const vehiculo = reserva.vehiculoPlaca || reserva.buseta || "-";

  return (
    <tr
      className={`${revisada ? "reservation-row-reviewed" : ""} reservation-row-clickable`}
        onDoubleClick={onOpenMap}
        title="Doble click para ver ruta en mapa"
    >
      <td className="dashboard-id-cell">#{reserva.id}</td>
      <td>{formatDashboardDate(reserva.fecha)}</td>
      <td>
        <div className="agency-cell">
          <span className={`agency-avatar ${agencyTheme}`}>
            {getAgencyInitials(reserva.proveedor)}
          </span>
          <span>{reserva.proveedor || "-"}</span>
        </div>
      </td>
      <td>{reserva.itinId || "-"}</td>
      <td>{reserva.pickUp || "-"}</td>
      <td>{reserva.dropOff || "-"}</td>
      <td>{formatDashboardTime(reserva.hora)}</td>
      <td>{reserva.AD ?? "-"}</td>
      <td>{reserva.NI ?? "-"}</td>
      <td>{reserva.cliente || "-"}</td>
      <td>
        {reserva.nota ? (
          <span className="dashboard-badge dashboard-badge-outline dashboard-note-badge">
            {reserva.nota}
          </span>
        ) : (
          <span className="dashboard-dash">-</span>
        )}
      </td>
      <td className="dashboard-col-hidden">{conductor}</td>
      <td className={showVehiculo ? "" : "dashboard-col-hidden"}>{vehiculo}</td>
      {showPrice ? (
        <td className="dashboard-price">{formatPrice(reserva.precio)}</td>
      ) : null}
      {showPayment ? (
        <td>
          <span
            className={`dashboard-badge ${
              paid ? "dashboard-badge-success" : "dashboard-badge-warning"
            }`}
          >
            {paid ? "Pagado" : "Pendiente"}
          </span>
        </td>
      ) : null}
      {showPayment ? (
        <td className="dashboard-col-hidden">
          {paid ? formatDashboardDate(reserva.fechaPago) : "-"}
        </td>
      ) : null}
      {canManage ? (
        <td className="text-right">
          <div className="row-actions">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              className="row-action-btn"
              title="Editar Reserva"
              aria-label="Editar Reserva"
            >
              <DashboardIcon name="pencil" size={15} />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onCancel();
              }}
              className="row-action-btn row-action-danger"
              title="Cancelar Reserva"
              aria-label="Cancelar Reserva"
            >
              <DashboardIcon name="trash" size={15} />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onToggleRevisada();
              }}
              className={`row-action-btn ${revisada ? "row-action-active" : ""}`}
              title={revisada ? "Marcar como no revisada" : "Marcar como revisada"}
              aria-label={revisada ? "Marcar como no revisada" : "Marcar como revisada"}
            >
              <DashboardIcon name="check" size={15} />
            </button>
          </div>
        </td>
      ) : null}
    </tr>
  );
}

function ReservationCard({
  reserva,
  revisada,
  onOpenMap,
  onToggleRevisada,
  onEdit,
  onCancel,
  canManage,
  showPrice,
  showPayment,
  isConductor,
}) {
  const paid = Boolean(reserva.pago);
  const agencyTheme = getAgencyTheme(reserva.proveedor);
  const conductor = reserva.conductorNombre || reserva.chofer || "-";
  const vehiculo = reserva.vehiculoPlaca || reserva.buseta || "";

  return (
    <article
      className={`reservation-card ${revisada ? "reservation-card-reviewed" : ""}`}
      onClick={onOpenMap}
      title="Ver ruta en mapa"
    >
      <div className="rc-header">
        <div className="rc-id-date">
          <div className="rc-id-row">
            <span className="rc-id">#{reserva.id}</span>
            <span className="rc-date">{formatDashboardDate(reserva.fecha)}</span>
          </div>
          <span className="rc-itin">Itin: {reserva.itinId || "-"}</span>
        </div>
        {showPayment ? (
          <div className="rc-status-block">
            <span
              className={`dashboard-badge ${
                paid ? "dashboard-badge-success" : "dashboard-badge-warning"
              }`}
            >
              {paid ? "Pagado" : "Pendiente"}
            </span>
            {paid && reserva.fechaPago ? (
              <span className="rc-status-date">
                {formatDashboardDate(reserva.fechaPago)}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rc-client-agency">
        <div className="rc-client">{reserva.cliente || "-"}</div>
        <div className="rc-agency">
          <span className={`agency-avatar ${agencyTheme}`}>
            {getAgencyInitials(reserva.proveedor)}
          </span>
          <span>{reserva.proveedor || "-"}</span>
        </div>
      </div>

      <div className="rc-route">
        <div className="route-point">
          <DashboardIcon name="circleDot" size={14} className="route-icon" />
          <span>{reserva.pickUp || "-"}</span>
        </div>
        <div className="route-line" />
        <div className="route-point">
          <DashboardIcon name="mapPin" size={14} className="route-icon" />
          <span>{reserva.dropOff || "-"}</span>
        </div>
      </div>

      <div className="rc-details">
        <div className="rc-detail-item">
          <DashboardIcon name="clock" size={14} className="detail-icon" />
          <span>{formatDashboardTime(reserva.hora)}</span>
        </div>
        <div className="rc-detail-item">
          <DashboardIcon name="users" size={14} className="detail-icon" />
          <span>
            {reserva.AD ?? 0}A, {reserva.NI ?? 0}N
          </span>
        </div>
        <div className="rc-detail-item">
          <DashboardIcon name="car" size={14} className="detail-icon" />
          <span>{isConductor ? vehiculo || "-" : `${conductor}${vehiculo ? ` (${vehiculo})` : ""}`}</span>
        </div>
        {showPrice ? (
          <div className="rc-detail-item price">{formatPrice(reserva.precio)}</div>
        ) : null}
      </div>

      <div className="rc-footer">
        <div className="rc-tags">
          {reserva.nota ? (
            <span className="dashboard-badge dashboard-badge-outline dashboard-note-badge">
              {reserva.nota}
            </span>
          ) : null}
          {revisada ? (
            <span className="dashboard-badge dashboard-badge-outline">Revisada</span>
          ) : null}
        </div>
        {canManage ? (
          <div className="rc-actions">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onToggleRevisada();
              }}
              className={`row-action-btn ${revisada ? "row-action-active" : ""}`}
              title={revisada ? "Marcar como no revisada" : "Marcar como revisada"}
              aria-label={revisada ? "Marcar como no revisada" : "Marcar como revisada"}
            >
              <DashboardIcon name="check" size={14} />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              className="row-action-btn"
              title="Editar Reserva"
              aria-label="Editar Reserva"
            >
              <DashboardIcon name="pencil" size={14} />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onCancel();
              }}
              className="row-action-btn row-action-danger"
              title="Cancelar Reserva"
              aria-label="Cancelar Reserva"
            >
              <DashboardIcon name="trash" size={14} />
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { role, user, profile } = useUser();
  const isAdmin = role === "admin";
  const isOperador = role === "operador";
  const isConductor = role === "conductor";
  const showPriceColumn = !isConductor;
  const showPaymentColumn = !isConductor;
  const canManageReservas = isAdmin || isOperador;
  const [filtro, setFiltro] = useState("activas");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const { filteredReservas, isLoading, setReservas } = useReservas(
    filtro,
    searchQuery,
    filters
  );
  const { invalidateCache } = useReservasData();
  const [revisadas, setRevisadas] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [mapReserva, setMapReserva] = useState(null);
  const logoutTimer = useRef(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
      }
    });

    if (typeof window !== "undefined") {
      const storedFiltro = localStorage.getItem("dashboardFiltro");
      const storedSearchQuery = localStorage.getItem("dashboardSearchQuery");
      const storedFilters = localStorage.getItem("dashboardFilters");
      const storedRevisadas = localStorage.getItem("reservasRevisadas");

      if (storedFiltro) setFiltro(storedFiltro);
      if (storedSearchQuery) setSearchQuery(storedSearchQuery);
      if (storedFilters) setFilters(JSON.parse(storedFilters));
      if (storedRevisadas) setRevisadas(JSON.parse(storedRevisadas));
    }

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    localStorage.setItem("dashboardFiltro", filtro);
    localStorage.setItem("dashboardSearchQuery", searchQuery);
    localStorage.setItem("dashboardFilters", JSON.stringify(filters));
  }, [filtro, searchQuery, filters]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("reservasRevisadas", JSON.stringify(revisadas));
  }, [revisadas]);

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

  const visibleReservas = useMemo(() => {
    if (!isConductor) return filteredReservas;
    const currentUid = user?.uid || "";
    const conductorNombre = (profile?.nombre || "").trim().toLowerCase();

    return filteredReservas.filter((reserva) => {
      const assignedUid = String(reserva.assignedUid || "").trim();
      if (assignedUid && currentUid) {
        return assignedUid === currentUid;
      }

      const nombreAsignado = String(reserva.conductorNombre || reserva.chofer || "")
        .trim()
        .toLowerCase();
      return Boolean(conductorNombre) && nombreAsignado === conductorNombre;
    });
  }, [filteredReservas, isConductor, profile?.nombre, user?.uid]);

  const totalPages = Math.ceil(visibleReservas.length / reservasPorPagina);

  useEffect(() => {
    const nextPage = Math.max(1, totalPages || 1);
    if (currentPage > nextPage) {
      setCurrentPage(nextPage);
    }
  }, [currentPage, totalPages]);

  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const handleNavigate = () => {
    router.push("/reservas");
  };

  const openDatePicker = (event) => {
    if (typeof event.currentTarget.showPicker === "function") {
      event.currentTarget.showPicker();
    }
  };

  const handleResetDashboard = () => {
    setFiltro("activas");
    setSearchQuery("");
    setFilters(EMPTY_FILTERS);
    setCurrentPage(1);
    invalidateCache();
    router.push("/dashboard");
  };

  const handleEditReserva = (id) => {
    localStorage.setItem("dashboardFiltro", filtro);
    localStorage.setItem("dashboardSearchQuery", searchQuery);
    localStorage.setItem("dashboardFilters", JSON.stringify(filters));
    router.push(`/reservas/edit/${id}`);
  };

  const toggleRevisada = (id) => {
    setRevisadas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openRouteMap = (reserva) => {
    setMapReserva(reserva);
  };

  const toggleCanceladas = () => {
    setCurrentPage(1);
    setFiltro((prev) => (prev === "canceladas" ? "activas" : "canceladas"));
  };

  const toggleAntiguas = () => {
    setCurrentPage(1);
    setFiltro((prev) => (prev === "antiguas" ? "activas" : "antiguas"));
  };

  const toggleFuturas = () => {
    setCurrentPage(1);
    setFiltro((prev) => (prev === "futuras" ? "activas" : "futuras"));
  };

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

    setReservas((prev) =>
      prev.map((reserva) =>
        reserva.id === id
          ? {
              ...reserva,
              cancelada: true,
              canceledAt: reserva.canceledAt || new Date().toISOString(),
            }
          : reserva
      )
    );
    invalidateCache();
    setFiltro("activas");
  };

  const handlePageChange = useCallback(
    (newPage) => {
      if (newPage < 1 || newPage > totalPages) return;
      setCurrentPage(newPage);
    },
    [totalPages]
  );

  const getVisibleColumnsForRole = (rowWithAllColumns) => {
    if (!isConductor) return rowWithAllColumns;

    const allowedColumns = [
      "ID",
      "Fecha",
      "Agencia",
      "ItinId",
      "PickUp",
      "DropOff",
      "Hora",
      "Adultos",
      "Niños",
      "Cliente",
      "Nota",
      "Conductor",
      "Vehiculo",
    ];

    return Object.fromEntries(
      Object.entries(rowWithAllColumns).filter(([key]) => allowedColumns.includes(key))
    );
  };

  const exportToExcel = async (data, fileName) => {
    try {
      toast.loading("Generando archivo Excel...", { id: "export" });

      const dataForExcel = data.map((r) => ({
        ID: r.id,
        Fecha: formatExcelDate(r.fecha),
        Agencia: r.proveedor,
        ItinId: r.itinId,
        PickUp: r.pickUp,
        DropOff: r.dropOff,
        Hora: r.hora,
        Adultos: r.AD,
        Niños: r.NI,
        Cliente: r.cliente,
        Nota: r.nota,
        Conductor: r.conductorNombre || r.chofer,
        Vehiculo: r.vehiculoPlaca || r.buseta,
        Precio: r.precio,
        Pago: r.pago ? "Sí" : "No",
        FechaPago: formatExcelDate(r.fechaPago),
        Cancelada: r.cancelada ? "Sí" : "No",
        CreatedAt: formatExcelDate(r.createdAt),
        CanceledAt: formatExcelDate(r.canceledAt),
      })).map((fullRow) => getVisibleColumnsForRole(fullRow));

      const workBook = new ExcelJS.Workbook();
      const workSheet = workBook.addWorksheet("Reservas");

      if (dataForExcel.length > 0) {
        const headers = Object.keys(dataForExcel[0]);
        workSheet.columns = headers.map((header) => ({
          header,
          key: header,
          width: Math.max(14, String(header).length + 2),
        }));
        dataForExcel.forEach((row) => workSheet.addRow(row));
      }

      const excelBuffer = await workBook.xlsx.writeBuffer();
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, `${fileName}.xlsx`);
      toast.success("Archivo Excel generado con éxito", { id: "export" });
    } catch (error) {
      console.error("Error al exportar a Excel:", error);
      toast.error("Error al generar el archivo Excel", { id: "export" });
    }
  };

  const indexOfLast = currentPage * reservasPorPagina;
  const indexOfFirst = indexOfLast - reservasPorPagina;
  const reservasPaginadas = useMemo(
    () => visibleReservas.slice(indexOfFirst, indexOfLast),
    [visibleReservas, indexOfFirst, indexOfLast]
  );

  const paginationSummary = getPaginationSummary(
    visibleReservas.length,
    currentPage,
    reservasPorPagina
  );

  const pageTitle =
    isConductor
      ? "Mis Reservas Asignadas"
      : filtro === "canceladas"
      ? "Reservas Canceladas"
      : filtro === "antiguas"
      ? "Reservas Antiguas"
      : filtro === "futuras"
      ? "Reservas Futuras"
      : "Reservas Activas";

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="dashboard-shell">
      <div className="dashboard-app">
        <header className="dashboard-header desktop-only">
          <div className="header-left-zone">
            <div className="search-box">
              <DashboardIcon name="search" size={16} className="search-icon" />
              <input
                type="text"
                title="Buscar por ID, ItinId, Cliente o Agencia"
                placeholder="Buscar reservas..."
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="icon-btn has-border"
              title="Filtros Avanzados"
              aria-label="Filtros Avanzados"
            >
              <DashboardIcon name="filter" size={18} />
            </button>
          </div>

          <button
            className="header-center-zone"
            onClick={handleResetDashboard}
            title="Ir al dashboard"
            aria-label="Ir al dashboard"
          >
            <span className="dashboard-logo-frame">
              <Logo />
            </span>
          </button>

          <div className="header-right-zone">
            <button
              onClick={() =>
                exportToExcel(
                  visibleReservas,
                  `Reservas_FIGA_${new Date().toISOString().split("T")[0]}`
                )
              }
              className="icon-btn"
              title="Exportar"
              aria-label="Exportar"
            >
              <DashboardIcon name="download" size={18} />
            </button>
            <button
              onClick={toggleCanceladas}
              className={`icon-btn ${filtro === "canceladas" ? "is-active" : ""}`}
              title={filtro === "canceladas" ? "Ver Activas" : "Ver Canceladas"}
              aria-label={filtro === "canceladas" ? "Ver Activas" : "Ver Canceladas"}
            >
              <DashboardIcon name="trash" size={18} />
            </button>
            <button
              onClick={toggleAntiguas}
              className={`icon-btn ${filtro === "antiguas" ? "is-active" : ""}`}
              title={filtro === "antiguas" ? "Ver Activas" : "Ver Antiguas"}
              aria-label={filtro === "antiguas" ? "Ver Activas" : "Ver Antiguas"}
            >
              <DashboardIcon name="undo" size={18} />
            </button>
            <button
              onClick={toggleFuturas}
              className={`icon-btn ${filtro === "futuras" ? "is-active" : ""}`}
              title={filtro === "futuras" ? "Ver Activas" : "Ver Futuras"}
              aria-label={filtro === "futuras" ? "Ver Activas" : "Ver Futuras"}
            >
              <DashboardIcon name="arrowRightCircle" size={18} />
            </button>
            {!isConductor ? (
              <button
                onClick={() => router.push("/opciones")}
                className="icon-btn"
                title="Opciones"
                aria-label="Opciones"
              >
                <DashboardIcon name="settings" size={18} />
              </button>
            ) : null}
            <div className="header-divider" />
            {canManageReservas ? (
              <button
                onClick={handleNavigate}
                title="Crear Reserva"
                aria-label="Crear Reserva"
                className="primary-btn"
              >
                <DashboardIcon name="plus" size={16} />
                <span>Nueva Reserva</span>
              </button>
            ) : null}
            <button
              onClick={logout}
              title="Cerrar Sesión"
              aria-label="Cerrar Sesión"
              className="icon-btn power-btn"
            >
              <DashboardIcon name="power" size={18} />
            </button>
          </div>
        </header>

        <header className="mobile-header mobile-only">
          <button
            onClick={() => setShowModal(true)}
            className="icon-btn"
            title="Abrir filtros"
            aria-label="Abrir filtros"
          >
            <DashboardIcon name="menu" size={24} />
          </button>

          <button
            className="mobile-logo-button"
            onClick={handleResetDashboard}
            title="Ir al dashboard"
            aria-label="Ir al dashboard"
          >
            <span className="dashboard-logo-frame mobile-logo-frame">
              <Logo />
            </span>
          </button>

          <button
            onClick={logout}
            title="Cerrar Sesión"
            aria-label="Cerrar Sesión"
            className="icon-btn power-btn"
          >
            <DashboardIcon name="power" size={20} />
          </button>
        </header>

        <section className="search-section mobile-only">
          <div className="search-row">
            <div className="search-box search-box-mobile">
              <DashboardIcon name="search" size={16} className="search-icon" />
              <input
                type="text"
                title="Buscar por ID, ItinId, Cliente o Agencia"
                placeholder="Buscar reservas..."
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="icon-btn has-border"
              title="Filtros Avanzados"
              aria-label="Filtros Avanzados"
            >
              <DashboardIcon name="filter" size={18} />
            </button>
          </div>

          <div className="actions-scroll">
            {canManageReservas ? (
              <button
                onClick={handleNavigate}
                title="Crear Reserva"
                aria-label="Crear Reserva"
                className="primary-btn"
              >
                <DashboardIcon name="plus" size={16} />
                <span>Nueva Reserva</span>
              </button>
            ) : null}
            <button
              onClick={() =>
                exportToExcel(
                  visibleReservas,
                  `Reservas_FIGA_${new Date().toISOString().split("T")[0]}`
                )
              }
              className="icon-btn has-border"
              title="Exportar"
              aria-label="Exportar"
            >
              <DashboardIcon name="download" size={18} />
            </button>
            <button
              onClick={toggleCanceladas}
              className={`icon-btn has-border ${filtro === "canceladas" ? "is-active" : ""}`}
              title={filtro === "canceladas" ? "Ver Activas" : "Ver Canceladas"}
              aria-label={filtro === "canceladas" ? "Ver Activas" : "Ver Canceladas"}
            >
              <DashboardIcon name="trash" size={18} />
            </button>
            <button
              onClick={toggleAntiguas}
              className={`icon-btn has-border ${filtro === "antiguas" ? "is-active" : ""}`}
              title={filtro === "antiguas" ? "Ver Activas" : "Ver Antiguas"}
              aria-label={filtro === "antiguas" ? "Ver Activas" : "Ver Antiguas"}
            >
              <DashboardIcon name="undo" size={18} />
            </button>
            <button
              onClick={toggleFuturas}
              className={`icon-btn has-border ${filtro === "futuras" ? "is-active" : ""}`}
              title={filtro === "futuras" ? "Ver Activas" : "Ver Futuras"}
              aria-label={filtro === "futuras" ? "Ver Activas" : "Ver Futuras"}
            >
              <DashboardIcon name="arrowRightCircle" size={18} />
            </button>
            {!isConductor ? (
              <button
                onClick={() => router.push("/opciones")}
                className="icon-btn has-border"
                title="Opciones"
                aria-label="Opciones"
              >
                <DashboardIcon name="settings" size={18} />
              </button>
            ) : null}
          </div>
        </section>

        <main className="dashboard-main">
          <div className="page-header">
            <h1 className="page-title">{pageTitle}</h1>
          </div>

          <section className="table-card desktop-only">
            <div className="table-responsive">
              <table className="dashboard-table data-table">
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
                    <th className="dashboard-col-hidden">Conductor</th>
                    <th className={isConductor ? "" : "dashboard-col-hidden"}>Vehiculo</th>
                    {showPriceColumn ? <th>Precio</th> : null}
                    {showPaymentColumn ? <th>Pago</th> : null}
                    {showPaymentColumn ? (
                      <th className="dashboard-col-hidden">FechaPago</th>
                    ) : null}
                    {canManageReservas ? <th className="text-center">Acciones</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {visibleReservas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={
                          14 +
                          (showPriceColumn ? 1 : 0) +
                          (showPaymentColumn ? 1 : 0) +
                          (canManageReservas ? 1 : 0)
                        }
                        className="empty-state-cell"
                      >
                        No se encontraron reservas con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    reservasPaginadas.map((reserva) => (
                      <ReservationTableRow
                        key={reserva.id}
                        reserva={reserva}
                        revisada={Boolean(revisadas[reserva.id])}
                        onOpenMap={() => openRouteMap(reserva)}
                        onToggleRevisada={() => toggleRevisada(reserva.id)}
                        onEdit={() => handleEditReserva(reserva.id)}
                        onCancel={() => handleCancelar(reserva.id)}
                        canManage={canManageReservas}
                        showPrice={showPriceColumn}
                        showPayment={showPaymentColumn}
                        showVehiculo={isConductor}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span className="pagination-info">{paginationSummary}</span>
              <div className="pagination-actions">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || totalPages === 0}
                  className="btn-outline"
                >
                  Anterior
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="btn-outline"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </section>

          <section className="mobile-only">
            <div className="reservation-list">
              {visibleReservas.length === 0 ? (
                <article className="reservation-card empty-card">
                  No se encontraron reservas con los filtros aplicados.
                </article>
              ) : (
                reservasPaginadas.map((reserva) => (
                  <ReservationCard
                    key={reserva.id}
                    reserva={reserva}
                    revisada={Boolean(revisadas[reserva.id])}
                    onOpenMap={() => openRouteMap(reserva)}
                    onToggleRevisada={() => toggleRevisada(reserva.id)}
                    onEdit={() => handleEditReserva(reserva.id)}
                    onCancel={() => handleCancelar(reserva.id)}
                    canManage={canManageReservas}
                    showPrice={showPriceColumn}
                    showPayment={showPaymentColumn}
                    isConductor={isConductor}
                  />
                ))
              )}
            </div>

            <div className="pagination-mobile">
              <span className="pagination-info">{paginationSummary}</span>
              <div className="pagination-actions mobile-pagination-actions">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || totalPages === 0}
                  className="btn-outline"
                >
                  Anterior
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="btn-outline"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </section>
        </main>

        {showModal && (
          <Suspense fallback={<div className="modal-loading">Cargando...</div>}>
            <Modal onClose={() => setShowModal(false)}>
              <h2 className="filter-modal-title col-span-8">Filtros Avanzados</h2>
              <label className="col-span-4 sm:col-span-2">Fecha Inicio</label>
              <input
                type="date"
                value={filters.startDate}
                onClick={openDatePicker}
                onFocus={openDatePicker}
                onKeyDown={(event) => event.preventDefault()}
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    startDate: event.target.value,
                  })
                }
                className="filter-field col-span-8 sm:col-span-6"
              />
              <label className="col-span-4 sm:col-span-2">Fecha Fin</label>
              <input
                type="date"
                value={filters.endDate}
                onClick={openDatePicker}
                onFocus={openDatePicker}
                onKeyDown={(event) => event.preventDefault()}
                onChange={(event) =>
                  setFilters({ ...filters, endDate: event.target.value })
                }
                className="filter-field col-span-8 sm:col-span-6"
              />
              <label className="col-span-4 sm:col-span-2">Mes</label>
              <select
                value={filters.month}
                onChange={(event) =>
                  setFilters({ ...filters, month: event.target.value })
                }
                className="filter-field col-span-8 sm:col-span-6"
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
              <label className="col-span-4 sm:col-span-2">Cliente</label>
              <input
                type="text"
                value={filters.cliente}
                onChange={(event) =>
                  setFilters({ ...filters, cliente: event.target.value })
                }
                className="filter-field col-span-8 sm:col-span-6"
              />
              <label className="col-span-4 sm:col-span-2">Agencia</label>
              <input
                type="text"
                value={filters.proveedor}
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    proveedor: event.target.value,
                  })
                }
                className="filter-field col-span-8 sm:col-span-6"
              />
              <label className="col-span-4 sm:col-span-2">ItinId</label>
              <input
                type="text"
                value={filters.itinId}
                onChange={(event) =>
                  setFilters({ ...filters, itinId: event.target.value })
                }
                className="filter-field col-span-8 sm:col-span-6"
              />
              <label className="col-span-4 sm:col-span-2">ID</label>
              <input
                type="text"
                value={filters.id}
                onChange={(event) =>
                  setFilters({ ...filters, id: event.target.value })
                }
                className="filter-field col-span-8 sm:col-span-6"
              />
              <div className="filter-modal-actions col-span-8">
                <button
                  onClick={() => {
                    setCurrentPage(1);
                    setShowModal(false);
                  }}
                  className="btn-outline"
                  title="Aplicar Filtros"
                >
                  Aplicar filtros
                </button>
                <button
                  onClick={() => {
                    setFilters(EMPTY_FILTERS);
                    setCurrentPage(1);
                  }}
                  className="btn-outline"
                  title="Limpiar Filtros"
                >
                  Limpiar
                </button>
              </div>
            </Modal>
          </Suspense>
        )}

        {mapReserva ? (
          <Suspense fallback={<div className="modal-loading">Cargando mapa...</div>}>
            <Modal onClose={() => setMapReserva(null)}>
              <div className="route-map-modal">
                <div className="route-map-header">
                  <h2 className="filter-modal-title">Ruta de la reserva #{mapReserva.id}</h2>
                  <p className="management-modal-subtitle route-map-subtitle">
                    <span className="route-map-point">{mapReserva.pickUp || "Sin pick up"}</span>
                    <DashboardIcon name="arrowRightCircle" size={14} className="route-map-arrow" />
                    <span className="route-map-point">{mapReserva.dropOff || "Sin drop off"}</span>
                  </p>
                </div>

                <div className="route-map-points-grid">
                  <article className="route-map-point-card">
                    <div className="route-map-point-label">
                      <DashboardIcon name="circleDot" size={13} />
                      <span>Pick up</span>
                    </div>
                    <p>{mapReserva.pickUp || "Sin pick up"}</p>
                  </article>
                  <article className="route-map-point-card">
                    <div className="route-map-point-label">
                      <DashboardIcon name="mapPin" size={13} />
                      <span>Drop off</span>
                    </div>
                    <p>{mapReserva.dropOff || "Sin drop off"}</p>
                  </article>
                </div>

                <Suspense fallback={<div className="route-map-fallback"><p>Cargando mapa…</p></div>}>
                  <ReservationMapLeaflet
                    pickUp={mapReserva.pickUp}
                    dropOff={mapReserva.dropOff}
                    conductorId={mapReserva.conductorId || null}
                    conductorUid={mapReserva.assignedUid || null}
                    conductorName={mapReserva.conductorNombre || mapReserva.chofer || ""}
                  />
                </Suspense>

                <div className="route-map-actions">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setMapReserva(null)}
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => {
                      const url = buildGoogleDirectionsUrl(
                        mapReserva.pickUp,
                        mapReserva.dropOff
                      );
                      if (!url) {
                        toast.error("Faltan pick up o drop off para abrir la ruta");
                        return;
                      }
                      window.open(url, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Abrir en Google Maps
                  </button>
                </div>
              </div>
            </Modal>
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}
